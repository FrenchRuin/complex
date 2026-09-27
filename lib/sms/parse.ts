/**
 * 카드·은행 알림 문자 인식 (F-15, SPEC §8.1). 순수 함수.
 * 결과는 미리보기용 추정값이고, 사용자가 확인·수정한 뒤 저장한다.
 */
import type { DateString } from "@/lib/date";

export type ParsedSms = {
  raw: string;
  amount: number;
  date: DateString;
  /** "HH:MM" */
  time: string | null;
  type: "expense" | "income";
  isCancel: boolean;
  merchant: string | null;
  /** 결제수단 별칭과 맞지 않을 때 표시만 하는 카드사 추정 */
  cardHint: string | null;
};

/** 카드사·은행 이름 (긴 것부터 본다). "농협"은 NH농협으로 표시 */
const CARD_COMPANIES: { match: string; label: string }[] = [
  { match: "카카오뱅크", label: "카카오뱅크" },
  { match: "nh농협", label: "NH농협" },
  { match: "kb국민", label: "KB국민" },
  { match: "농협", label: "NH농협" },
  { match: "국민", label: "KB국민" },
  { match: "신한", label: "신한" },
  { match: "삼성", label: "삼성" },
  { match: "현대", label: "현대" },
  { match: "롯데", label: "롯데" },
  { match: "하나", label: "하나" },
  { match: "우리", label: "우리" },
  { match: "토스", label: "토스" },
  { match: "ibk", label: "IBK" },
  { match: "bc", label: "BC" },
];

const AMOUNT = /(\d{1,3}(?:,\d{3})+|\d+)\s*원/g;
const SKIP_BEFORE_AMOUNT = /(누적|잔액|한도)\s*$/;
const DATE_KOREAN = /(\d{1,2})월\s*(\d{1,2})일/;
const DATE_NUMERIC = /(?<!\d)(\d{1,2})[/.-](\d{1,2})(?![\d/.-])/;
const TIME = /(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/;
const MASKED_NAME = /[가-힣]\*[가-힣]/;
const ACCOUNT_NUMBER = /\d+-[\d*]+(-[\d*]+)*/g;
const EXCLUDE_WORDS = /승인|일시불|할부|개월|누적|잔액|취소|입금|출금|결제|완료|님(?![가-힣])/;
const HEADER = /^\[[^\]]*\]\s*/;

/** 여러 건을 한 번에 붙여넣은 글을 문자 단위로 나눈다. 금액이 없는 조각은 버린다 */
export function splitMessages(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\[Web발신\]/g, "\n\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => /\d\s*원/.test(part));
}

function firstAmount(message: string): number | null {
  for (const match of message.matchAll(AMOUNT)) {
    const before = message.slice(Math.max(0, (match.index ?? 0) - 6), match.index);
    if (SKIP_BEFORE_AMOUNT.test(before)) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isSafeInteger(value) && value > 0) return value;
  }
  return null;
}

function validDay(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** 날짜: 연도는 올해, 인식한 월이 이번 달보다 2개월 이상 뒤면 작년. 없으면 오늘 */
function findDate(message: string, today: DateString): DateString {
  const match = message.match(DATE_KOREAN) ?? message.match(DATE_NUMERIC);
  if (!match) return today;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const [thisYear, thisMonth] = today.split("-").map(Number);
  const year = month - thisMonth >= 2 ? thisYear - 1 : thisYear;
  if (month < 1 || month > 12 || !validDay(year, month, day)) return today;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findTime(message: string): string | null {
  const match = message.match(TIME);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

function findCard(message: string): string | null {
  const text = message.toLowerCase().replace(/\s/g, "");
  return CARD_COMPANIES.find(({ match }) => text.includes(match))?.label ?? null;
}

/** 카드사 이름 뒤에 카드/숫자/괄호/승인 등이 붙은 줄 (가맹점 "하나로마트"는 해당 안 됨) */
function isCardLine(line: string): boolean {
  if (/카드|뱅크|은행/.test(line)) return true;
  const lower = line.toLowerCase();
  return CARD_COMPANIES.some(({ match }) =>
    new RegExp(`${match}(\\d|\\(|\\s*(승인|입금|출금|취소)|\\s*$)`).test(lower),
  );
}

function cleanMerchant(text: string): string | null {
  const cleaned = text
    .replace(HEADER, "")
    .replace(AMOUNT, " ")
    .replace(ACCOUNT_NUMBER, " ")
    .replace(/승인|일시불|결제\s*완료|결제|출금|입금|취소/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, 50) : null;
}

/**
 * 가맹점: 날짜·시간을 지운 뒤 금액·카드명·승인/일시불/할부/누적/잔액·마스킹된 이름이 없는 마지막 줄.
 * 그런 줄이 없으면(한 줄짜리 문자) 시간 뒤 글자에서 누적/잔액 전까지.
 */
function findMerchant(message: string): string | null {
  const lines = message
    .split("\n")
    .map((line) => line.replace(HEADER, "").replace(DATE_KOREAN, " ").replace(DATE_NUMERIC, " ").replace(TIME, " ").trim())
    .filter(Boolean);

  const candidates = lines.filter(
    (line) =>
      !/\d\s*원/.test(line) &&
      !EXCLUDE_WORDS.test(line) &&
      !MASKED_NAME.test(line) &&
      !isCardLine(line) &&
      /[가-힣a-zA-Z]/.test(line),
  );
  if (candidates.length > 0) return cleanMerchant(candidates[candidates.length - 1]);

  const flat = message.replace(/\n/g, " ");
  const time = flat.match(TIME);
  if (!time || time.index === undefined) return null;
  const after = flat.slice(time.index + time[0].length).split(/누적|잔액/)[0];
  return cleanMerchant(after);
}

export function parseSms(message: string, today: DateString): ParsedSms | null {
  const amount = firstAmount(message);
  if (amount === null) return null;
  const hasDeposit = message.includes("입금");
  const hasWithdraw = message.includes("출금");

  return {
    raw: message,
    amount,
    date: findDate(message, today),
    time: findTime(message),
    type: hasDeposit && !hasWithdraw ? "income" : "expense",
    isCancel: message.includes("취소"),
    merchant: findMerchant(message),
    cardHint: findCard(message),
  };
}

/** 붙여넣은 글 전체 → 인식한 문자 목록 */
export function parseSmsText(text: string, today: DateString): ParsedSms[] {
  return splitMessages(text)
    .map((message) => parseSms(message, today))
    .filter((parsed): parsed is ParsedSms => parsed !== null);
}
