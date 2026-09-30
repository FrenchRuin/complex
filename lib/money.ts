/**
 * 금액 포맷·파싱. 금액은 항상 원 단위 정수다.
 * 화면에 금액을 쓸 때는 이 파일의 함수만 사용한다.
 */

const wonFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const manFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

/** 12000 → "12,000원" */
export function formatWon(amount: number): string {
  return `${wonFormatter.format(amount)}원`;
}

/** 쉼표만 붙인다. 입력창 표시용. 12000 → "12,000" */
export function formatNumber(amount: number): string {
  return wonFormatter.format(amount);
}

/**
 * 좁은 곳(캘린더, 그래프)용 짧은 표기.
 * 1만 이상은 만 단위 소수 첫째 자리: 87000 → "8.7만", 100000 → "10만".
 * 1만 미만은 쉼표: 8500 → "8,500".
 */
export function formatWonShort(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs < 10_000) {
    return `${sign}${wonFormatter.format(abs)}`;
  }
  const man = Math.round(abs / 1_000) / 10;
  return `${sign}${manFormatter.format(man)}만`;
}

/**
 * 폰 달력 칸처럼 아주 좁은 곳용. formatWonShort보다 짧게:
 * 100만 이상은 소수·쉼표 없이 "172만", "1235만", 1억 이상은 "1.2억". 그 아래는 formatWonShort와 같다.
 */
export function formatWonTiny(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const man = Math.round(abs / 10_000);
  // 반올림해서 1억이 되는 금액(9,999.5만 이상)도 억으로
  if (man >= 10_000) {
    return `${sign}${manFormatter.format(Math.round(abs / 10_000_000) / 10)}억`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${man}만`;
  }
  return formatWonShort(amount);
}

const KOREAN_UNITS = [
  { unit: "조", size: 1_000_000_000_000 },
  { unit: "억", size: 100_000_000 },
  { unit: "만", size: 10_000 },
] as const;

/**
 * 금액 입력칸 아래 읽기 도움말: 123456000 → "1억 2,345만 6,000원", 300000000 → "3억 원".
 */
export function formatWonKorean(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  let rest = Math.abs(Math.trunc(amount));
  const parts: string[] = [];
  for (const { unit, size } of KOREAN_UNITS) {
    const n = Math.floor(rest / size);
    if (n > 0) parts.push(`${wonFormatter.format(n)}${unit}`);
    rest %= size;
  }
  if (parts.length === 0) return `${sign}${wonFormatter.format(rest)}원`;
  return rest > 0 ? `${sign}${parts.join(" ")} ${wonFormatter.format(rest)}원` : `${sign}${parts.join(" ")} 원`;
}

const eokFormatter =new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

/**
 * 대출 한도·조건처럼 큰 금액을 글로: 600000000 → "6억 원", 511000000 → "5.11억 원", 85000000 → "8,500만 원".
 */
export function formatEok(amount: number): string {
  if (amount >= 100_000_000) return `${eokFormatter.format(amount / 100_000_000)}억 원`;
  return `${wonFormatter.format(Math.floor(amount / 10_000))}만 원`;
}

/**
 * 사용자가 입력한 금액 문자열을 정수로 바꾼다. 숫자가 없으면 null.
 * "12,000원" → 12000, " 3 500 " → 3500
 */
export function parseWon(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}
