/** 서버 액션 결과. 성공하면 error가 null, savedAt에 저장 시각 */
export type ActionResult = { error: string | null; savedAt?: number };

export const INITIAL: ActionResult = { error: null };

export function ok(): ActionResult {
  return { error: null, savedAt: Date.now() };
}

export function fail(message: string): ActionResult {
  return { error: message };
}

/** DB 함수(RPC)가 raise 한 코드 → 사용자 문구 */
const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "로그인이 풀렸어요. 다시 로그인해 주세요",
  not_member: "아직 가구에 들어가 있지 않아요",
  already_member: "이미 가구에 들어가 있어요. 홈으로 가 주세요",
  household_full: "이 가구는 이미 두 명이 함께 쓰고 있어요",
  invite_not_found: "초대 링크를 찾을 수 없어요. 링크를 다시 받아 주세요",
  invite_used: "이미 사용한 초대 링크예요. 새 링크를 받아 주세요",
  invite_expired: "초대 링크가 만료됐어요. 새 링크를 받아 주세요",
  invalid_category: "카테고리를 찾을 수 없어요. 새로고침 후 다시 골라 주세요",
  category_type_mismatch: "지출/수입에 맞는 카테고리를 골라 주세요",
  invalid_payment_method: "결제수단을 찾을 수 없어요. 새로고침 후 다시 골라 주세요",
  invalid_recurring_item: "정기지출을 찾을 수 없어요. 새로고침해 주세요",
  recurring_not_in_month: "이번 달에는 이 정기지출이 없어요. 새로고침해 주세요",
  already_paid: "이미 납부 체크했어요. 새로고침해 주세요",
  invalid_amount: "금액을 입력해 주세요",
  invalid_goal: "저축 목표를 찾을 수 없어요. 새로고침해 주세요",};

const FALLBACK = "저장하지 못했어요. 잠시 후 다시 시도해 주세요";

export function dbErrorMessage(error: { message: string; code?: string } | null): string {
  if (!error) return FALLBACK;
  const known = RPC_ERROR_MESSAGES[error.message];
  if (known) return known;
  // 23505: unique 위반
  if (error.code === "23505") return "같은 이름이 이미 있어요. 다른 이름을 써 주세요";
  return FALLBACK;
}
