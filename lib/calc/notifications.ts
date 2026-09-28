import { relativeDayLabel } from "@/lib/calc/dashboard";
import { formatTimeKST, monthOf, todayKST, type DateString } from "@/lib/date";
import { formatWon } from "@/lib/money";

/** 알림 종류 (F-17). DB notifications.kind와 같다 */
export type NotificationKind = "created" | "updated" | "deleted" | "restored" | "recurring_paid" | "sms_batch";

export type NotificationItem = {
  id: string;
  createdAt: string;
  kind: NotificationKind;
  actorId: string;
  transactionId: string | null;
  occurredOn: DateString | null;
  subject: string | null;
  amount: number | null;
  count: number;
  read: boolean;
};

const KINDS: readonly NotificationKind[] = ["created", "updated", "deleted", "restored", "recurring_paid", "sms_batch"];

export function toNotificationKind(value: string): NotificationKind {
  return (KINDS as readonly string[]).includes(value) ? (value as NotificationKind) : "updated";
}

const ACTION_TEXT: Record<"created" | "updated" | "deleted" | "restored", string> = {
  created: "추가했어요",
  updated: "수정했어요",
  deleted: "삭제했어요",
  restored: "되돌렸어요",
};

/**
 * "서연님이 다이소 12,000원을 추가했어요"
 * "서연님이 월세 700,000원 납부를 체크했어요"
 * "서연님이 문자로 5건을 추가했어요"
 */
export function notificationSentence(item: Pick<NotificationItem, "kind" | "subject" | "amount" | "count">, actorName: string): string {
  const who = `${actorName}님이`;
  if (item.kind === "sms_batch") return `${who} 문자로 ${item.count}건을 추가했어요`;

  // 문자 묶음이 아니면 DB가 금액을 항상 채운다. 그래서 "…원을"로 끝나 조사가 늘 "을"
  const what = `${item.subject ?? "내역"} ${formatWon(item.amount ?? 0)}`;
  if (item.kind === "recurring_paid") return `${who} ${what} 납부를 체크했어요`;
  return `${who} ${what}을 ${ACTION_TEXT[item.kind]}`;
}

/**
 * 누르면 갈 곳: 그 내역의 날짜 (+ 편집 창 열기). 삭제된 내역은 날짜만, 문자 묶음은 그 달만.
 */
export function notificationHref(item: Pick<NotificationItem, "kind" | "transactionId" | "occurredOn">): string {
  if (!item.occurredOn) return "/transactions";
  const params = new URLSearchParams({ month: monthOf(item.occurredOn) });
  if (item.kind === "sms_batch") return `/transactions?${params}`;
  params.set("day", item.occurredOn);
  if (item.transactionId && item.kind !== "deleted") params.set("tx", item.transactionId);
  return `/transactions?${params}`;
}

/** "오늘 14:05" / "어제 21:10" / "3일 전" / "9월 2일" */
export function notificationTimeLabel(createdAt: string, now: Date = new Date()): string {
  const day = relativeDayLabel(todayKST(new Date(createdAt)), todayKST(now));
  return day === "오늘" || day === "어제" ? `${day} ${formatTimeKST(createdAt)}` : day;
}
