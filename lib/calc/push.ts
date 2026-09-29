/**
 * 휴대폰 알림(웹 푸시) 계산 (F-57). 문장·주소는 앱 안 알림(F-17)과 같다.
 */
import { notificationHref, notificationSentence, type NotificationItem } from "@/lib/calc/notifications";

/** 새로 생긴 지 이만큼 안 된 알림만 보낸다 (DB가 부른 직후만, 주소가 알려져도 옛 알림을 다시 못 보내게) */
export const PUSH_WINDOW_MS = 2 * 60 * 1000;

export type PushPayload = { title: string; body: string; url: string; tag: string };

/** 보낼 수 있는 알림인지: 아직 안 보냈고, 2분 안에 생긴 것 */
export function isPushable(n: { createdAt: string; pushedAt: string | null }, now: Date = new Date()): boolean {
  if (n.pushedAt !== null) return false;
  const age = now.getTime() - new Date(n.createdAt).getTime();
  return age >= -60_000 && age <= PUSH_WINDOW_MS;
}

/** 폰에 띄울 내용 */
export function pushPayload(
  item: Pick<NotificationItem, "id" | "kind" | "subject" | "amount" | "count" | "transactionId" | "noteId" | "eventId" | "occurredOn">,
  actorName: string,
): PushPayload {
  return {
    title: "감자밭",
    body: notificationSentence(item, actorName),
    url: notificationHref(item),
    // 같은 내역·메모·일정 알림은 폰에서 하나로 겹친다
    tag: item.transactionId ?? item.noteId ?? item.eventId ?? item.id,
  };
}

/** 기기 이름: "iPhone · Safari", "Android · Chrome" (보여주기용, 대략) */
export function deviceLabel(userAgent: string): string {
  const os = /iPhone|iPad/.test(userAgent)
    ? "iPhone"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "Mac"
        : /Windows/.test(userAgent)
          ? "Windows"
          : "기기";
  const browser = /SamsungBrowser/.test(userAgent)
    ? "삼성 인터넷"
    : /Edg\//.test(userAgent)
      ? "Edge"
      : /CriOS|Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : /Firefox\//.test(userAgent)
            ? "Firefox"
            : "브라우저";
  return `${os} · ${browser}`;
}
