import { cache } from "react";
import { toNotificationKind, type NotificationItem } from "./calc/notifications";
import { addDays, todayKST } from "./date";
import { createClient } from "./supabase/server";

/** 알림 목록에 보여줄 기간·개수 */
const DAYS = 30;
const LIMIT = 50;

/** 나에게 온 최근 알림 (F-17). RLS가 받는 사람을 나로 좁힌다. */
export const getMyNotifications = cache(async (): Promise<NotificationItem[]> => {
  const supabase = await createClient();
  const since = `${addDays(todayKST(), -DAYS)}T00:00:00+09:00`;
  const { data, error } = await supabase
    .from("notifications")
    .select("id, created_at, kind, actor_id, transaction_id, note_id, event_id, occurred_on, subject, amount, count, read_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) throw new Error(`알림을 불러오지 못했어요: ${error.message}`);

  return data.map((n) => ({
    id: n.id,
    createdAt: n.created_at,
    kind: toNotificationKind(n.kind),
    actorId: n.actor_id,
    transactionId: n.transaction_id,
    noteId: n.note_id,
    eventId: n.event_id,
    occurredOn: n.occurred_on,
    subject: n.subject,
    amount: n.amount,
    count: n.count,
    read: n.read_at !== null,
  }));
});
