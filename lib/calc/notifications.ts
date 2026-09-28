import { relativeDayLabel } from "@/lib/calc/dashboard";
import { formatTimeKST, monthOf, todayKST, type DateString } from "@/lib/date";
import { formatWon } from "@/lib/money";

/** 알림 종류 (F-17, 메모는 F-18). DB notifications.kind와 같다 */
export type NotificationKind =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "recurring_paid"
  | "sms_batch"
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "note_restored"
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "event_restored";

export type NotificationItem = {
  id: string;
  createdAt: string;
  kind: NotificationKind;
  actorId: string;
  transactionId: string | null;
  noteId: string | null;
  eventId: string | null;
  occurredOn: DateString | null;
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
  "sms_batch",
  "note_created",
  "note_updated",
  "note_deleted",
  "note_restored",
  "event_created",
  "event_updated",
  "event_deleted",
  "event_restored",
];

const EVENT_ACTION_TEXT = {
  event_created: "추가했어요",
  event_updated: "수정했어요",
  event_deleted: "삭제했어요",
  event_restored: "되돌렸어요",
} as const;

function isEventKind(kind: NotificationKind): kind is keyof typeof EVENT_ACTION_TEXT {
  return kind in EVENT_ACTION_TEXT;
}

const NOTE_ACTION_TEXT = {
  note_created: "썼어요",
  note_updated: "고쳤어요",
  note_deleted: "지웠어요",
  note_restored: "되돌렸어요",
} as const;

function isNoteKind(kind: NotificationKind): kind is keyof typeof NOTE_ACTION_TEXT {
  return kind in NOTE_ACTION_TEXT;
}

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
  if (isNoteKind(item.kind)) {
    const title = item.subject ?? "제목 없는 메모";
    return `${who} 메모 ‘${title}’${objectParticle(title)} ${NOTE_ACTION_TEXT[item.kind]}`;
  }
  if (isEventKind(item.kind)) {
    const title = item.subject ?? "일정";
    return `${who} 일정 ‘${title}’${objectParticle(title)} ${EVENT_ACTION_TEXT[item.kind]}`;
  }
  if (item.kind === "sms_batch") return `${who} 문자로 ${item.count}건을 추가했어요`;

  // 문자 묶음이 아니면 DB가 금액을 항상 채운다. 그래서 "…원을"로 끝나 조사가 늘 "을"
  const what = `${item.subject ?? "내역"} ${formatWon(item.amount ?? 0)}`;
  if (item.kind === "recurring_paid") return `${who} ${what} 납부를 체크했어요`;
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
 * 메모는 그 메모를 연다 (지운 메모는 메모 화면만).
 */
export function notificationHref(
  item: Pick<NotificationItem, "kind" | "transactionId" | "occurredOn"> & { noteId?: string | null; eventId?: string | null },
): string {
  if (isEventKind(item.kind)) {
    const params = new URLSearchParams();
    if (item.occurredOn) params.set("month", monthOf(item.occurredOn));
    if (item.eventId && item.kind !== "event_deleted") params.set("event", item.eventId);
    const query = params.toString();
    return query ? `/schedule?${query}` : "/schedule";
  }
  if (isNoteKind(item.kind)) {
    return item.noteId && item.kind !== "note_deleted" ? `/notes?note=${item.noteId}` : "/notes";
  }
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
