/**
 * 가맹점 이름 정리와 카테고리 추천 (F-16, SPEC §8.1).
 */
import type { CategoryType } from "@/lib/domain";

/** 소문자 + 공백 제거. DB 함수 normalize_merchant와 같아야 한다. */
export function normalizeMerchant(merchant: string | null | undefined): string {
  return (merchant ?? "").replace(/\s/g, "").toLowerCase();
}

/** 기본 키워드 사전: 가맹점에 들어 있으면 → 카테고리 이름 (SPEC §8.1) */
export const KEYWORD_CATEGORIES: { keywords: string[]; category: string }[] = [
  { keywords: ["스타벅스", "투썸", "이디야", "메가커피", "빽다방", "컴포즈", "파리바게뜨"], category: "카페·간식" },
  { keywords: ["배달의민족", "배민", "요기요", "쿠팡이츠"], category: "배달" },
  {
    keywords: ["이마트", "홈플러스", "롯데마트", "코스트코", "gs25", "cu", "세븐일레븐", "다이소", "컬리"],
    category: "생활·마트",
  },
  { keywords: ["카카오t", "택시", "티머니", "코레일", "srt", "주유"], category: "교통" },
  { keywords: ["쿠팡", "11번가", "g마켓", "무신사"], category: "쇼핑" },
  { keywords: ["약국", "병원", "의원", "치과"], category: "의료" },
  { keywords: ["cgv", "메가박스", "롯데시네마"], category: "데이트·여가" },
  { keywords: ["넷플릭스", "유튜브", "티빙", "웨이브"], category: "구독" },
];

type CategoryRef = { id: string; name: string; type: CategoryType };

/** 짧은 키워드("cu")가 다른 단어 안에서 잘못 걸리지 않게, 영문 2글자 이하는 단어 경계로만 본다 */
function containsKeyword(key: string, keyword: string): boolean {
  const k = normalizeMerchant(keyword);
  if (/^[a-z0-9]{1,2}$/.test(k)) return new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(key);
  return key.includes(k);
}

/**
 * 카테고리 추천 순서: 기억한 규칙 → 키워드 사전 → 없음(null).
 * 추천 카테고리가 지금 유형(지출/수입)과 맞지 않거나 숨김이면 쓰지 않는다.
 */
export function suggestCategory(
  merchant: string,
  type: CategoryType,
  rules: Record<string, string>,
  categories: readonly CategoryRef[],
): string | null {
  const key = normalizeMerchant(merchant);
  if (!key) return null;
  const usable = categories.filter((c) => c.type === type);

  const ruled = rules[key];
  if (ruled && usable.some((c) => c.id === ruled)) return ruled;

  // "쿠팡이츠"가 "쿠팡"보다 먼저 걸리도록 긴 키워드부터 본다
  const matches = KEYWORD_CATEGORIES.flatMap(({ keywords, category }) =>
    keywords.map((keyword) => ({ keyword, category })),
  )
    .filter(({ keyword }) => containsKeyword(key, keyword))
    .sort((a, b) => b.keyword.length - a.keyword.length);

  for (const { category } of matches) {
    const found = usable.find((c) => c.name === category);
    if (found) return found.id;
  }
  return null;
}

/** 추천이 없을 때 쓸 "기타" (지출: 기타, 수입: 기타수입) */
export function fallbackCategory(type: CategoryType, categories: readonly CategoryRef[]): string | null {
  const name = type === "expense" ? "기타" : "기타수입";
  return categories.find((c) => c.type === type && c.name === name)?.id ?? null;
}
