import { relativeDayLabel } from "@/lib/calc/dashboard";
import { isMoodKey, moodOf } from "@/lib/calc/mood";
import { formatTimeKST, todayKST, type DateString } from "@/lib/date";
import { formatWon } from "@/lib/money";

/** 알림 종류 (F-17, 기분은 F-04). DB notifications.kind와 같다 */
export type NotificationKind =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "recurring_paid"
  | "recurring_unchecked"
  | "sms_batch"
  | "mood_set";

export type NotificationItem = {
  id: string;
  createdAt: string;
  kind: NotificationKind;
  actorId: string;
  transactionId: string | null;
  occurredOn: DateString | null;
  /** 기분 알림(F-04)의 기분 키 */
  mood: string | null;
  subject: string | null;
  amount: number | null;
  count: number;
  read: boolean;
};

const KINDS: readonly NotificationKind[] = [
  "created",
  "updated",
  "deleted",
  "restored",
  "recurring_paid",
  "recurring_unchecked",
  "sms_batch",
  "mood_set",
];

/** DB 값 → 알림 종류. 지운 기능(메모·일정 등)의 알림이나 모르는 값은 null (목록에서 뺀다) */
export function toNotificationKind(value: string): NotificationKind | null {
  return (KINDS as readonly string[]).includes(value) ? (value as NotificationKind) : null;
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
 * "서연님이 월세 700,000원 납부 체크를 풀었어요"
 * "서연님이 문자로 5건을 추가했어요"
 * "서연님이 오늘 기분을 🥰 행복해요로 정했어요 · 야근 중" (F-04)
 */
export function notificationSentence(
  item: Pick<NotificationItem, "kind" | "subject" | "amount" | "count"> & { occurredOn?: DateString | null; mood?: string | null },
  actorName: string,
): string {
  const who = `${actorName}님이`;
  if (item.kind === "mood_set") {
    const m = item.mood && isMoodKey(item.mood) ? moodOf(item.mood) : null;
    const what = m ? `${m.emoji} ${m.label}` : "새 기분";
    return `${who} 오늘 기분을 ${what}로 정했어요${item.subject ? ` · ${item.subject}` : ""}`;
  }
  if (item.kind === "sms_batch") return `${who} 문자로 ${item.count}건을 추가했어요`;

  // 문자 묶음이 아니면 DB가 금액을 항상 채운다. 그래서 "…원을"로 끝나 조사가 늘 "을"
  const what = `${item.subject ?? "내역"} ${formatWon(item.amount ?? 0)}`;
  if (item.kind === "recurring_paid") return `${who} ${what} 납부를 체크했어요`;
  if (item.kind === "recurring_unchecked") return `${who} ${what} 납부 체크를 풀었어요`;
  return `${who} ${what}을 ${ACTION_TEXT[item.kind as keyof typeof ACTION_TEXT]}`;
}

/** 을/를: 마지막 글자에 받침이 있으면 "을". 한글이 아니면(숫자·영문) "를"로 둔다 */
export function objectParticle(word: string): "을" | "를" {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? "를" : "을";
  return "를";
}

/**
 * 누르면 갈 곳: 그 내역의 날짜 (+ 편집 창 열기). 삭제된 내역은 날짜만, 문자 묶음은 그 달만.
 */
export function notificationHref(
  item: Pick<NotificationItem, "kind" | "transactionId" | "occurredOn">,
): string {
  if (item.kind === "mood_set") return "/";
  if (!item.occurredOn) return "/transactions";
  // month 없이 날짜만 주면 내역 화면이 한 달 기준(F-56)으로 그 날짜가 든 달을 연다. 문자 묶음은 그 달만(at)
  if (item.kind === "sms_batch") return `/transactions?at=${item.occurredOn}`;
  const params = new URLSearchParams({ day: item.occurredOn });
  // 지운 내역(체크를 푼 정기지출 포함)은 날짜만
  if (item.transactionId && item.kind !== "deleted" && item.kind !== "recurring_unchecked") {
    params.set("tx", item.transactionId);
  }
  return `/transactions?${params}`;
}

/** "오늘 14:05" / "어제 21:10" / "3일 전" / "9월 2일" */
export function notificationTimeLabel(createdAt: string, now: Date = new Date()): string {
  const day = relativeDayLabel(todayKST(new Date(createdAt)), todayKST(now));
  return day === "오늘" || day === "어제" ? `${day} ${formatTimeKST(createdAt)}` : day;
}
