/**
 * 휴대폰 알림 보내기 (F-57). 서버 전용: 서비스 키로 DB를 읽고, web-push로 폰에 보낸다.
 * app/api/push(DB가 부름)와 시험 알림 서버 액션에서만 가져다 쓴다.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isPushable, pushPayload, type PushPayload } from "./calc/push";
import { toNotificationKind } from "./calc/notifications";
import type { Database } from "./supabase/types";

if (typeof window !== "undefined") {
  throw new Error("push-server는 서버에서만 쓸 수 있어요");
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY가 비어 있어요. .env.local과 Vercel 환경변수를 확인해 주세요");
  return createSupabaseClient<Database>(url, key, { auth: { persistSession: false } });
}

/**
 * 알림 공개키. 브라우저가 알아야 하는 공개 값이지만, 번들에 넣지 않고 서버가 설정 화면에 넘겨준다
 * (Vercel에 VAPID_PUBLIC_KEY로 등록. 예전 이름 NEXT_PUBLIC_VAPID_PUBLIC_KEY도 읽는다)
 */
export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

/** 알림 키가 모두 있을 때만 보낸다 (없으면 조용히 건너뜀: 개발 PC 등) */
function configure(): boolean {
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** 한 사람의 모든 기기로 보낸다. 사라진 기기(404·410)는 지운다. 보낸 기기 수를 돌려준다 */
async function sendToMember(memberId: string, payload: PushPayload): Promise<number> {
  const db = admin();
  const { data: subs, error } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("member_id", memberId);
  if (error) throw new Error(`기기 목록을 불러오지 못했어요: ${error.message}`);

  let sent = 0;
  const gone: string[] = [];
  const used: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
        used.push(s.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id);
      }
    }),
  );
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  if (used.length) await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", used);
  return sent;
}

/**
 * DB가 알림 번호를 넘기면: 2분 안에 생겼고 아직 안 보낸 알림만, 먼저 "보냄"으로 표시한 뒤 받는 사람 기기로 보낸다.
 * (표시를 먼저 해 두어 같은 번호로 두 번 불려도 한 번만 간다)
 */
export async function sendPushForNotification(id: string): Promise<{ sent: number; skipped?: string }> {
  if (!configure()) return { sent: 0, skipped: "no_keys" };
  const db = admin();
  const { data: n, error } = await db
    .from("notifications")
    .select("id, created_at, pushed_at, kind, recipient_id, actor_id, transaction_id, note_id, event_id, occurred_on, subject, amount, count")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`알림을 불러오지 못했어요: ${error.message}`);
  if (!n || !isPushable({ createdAt: n.created_at, pushedAt: n.pushed_at })) return { sent: 0, skipped: "not_pushable" };

  const { data: claimed } = await db
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    .select("id");
  if (!claimed?.length) return { sent: 0, skipped: "already_pushed" };

  const { data: actor } = await db.from("members").select("display_name").eq("id", n.actor_id).maybeSingle();
  const payload = pushPayload(
    {
      id: n.id,
      kind: toNotificationKind(n.kind),
      subject: n.subject,
      amount: n.amount,
      count: n.count,
      transactionId: n.transaction_id,
      noteId: n.note_id,
      eventId: n.event_id,
      occurredOn: n.occurred_on,
    },
    actor?.display_name ?? "구성원",
  );
  return { sent: await sendToMember(n.recipient_id, payload) };
}

/** 시험 알림: 이 사람의 모든 기기로 */
export async function sendTestPush(memberId: string): Promise<number> {
  if (!configure()) throw new Error("알림 키가 설정되지 않았어요. 환경변수를 확인해 주세요");
  return sendToMember(memberId, {
    title: "우리 둘 가계부",
    body: "시험 알림이에요. 이렇게 알림이 와요.",
    url: "/settings/push",
    tag: "test",
  });
}
