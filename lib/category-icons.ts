/**
 * 카테고리에 쓸 수 있는 Lucide 아이콘 이름. DB에는 이 이름(kebab-case)으로 저장한다.
 * 실제 아이콘 컴포넌트 연결은 components/ui/CategoryIcon.tsx.
 */
export const CATEGORY_ICON_NAMES = [
  // 기본 카테고리 (SPEC §7)
  "utensils",
  "coffee",
  "bike",
  "shopping-cart",
  "house",
  "smartphone",
  "bus",
  "shopping-bag",
  "pill",
  "shield",
  "square-play",
  "gift",
  "film",
  "train-front",
  "circle-ellipsis",
  "wallet",
  "coins",
  "undo-2",
  "circle-plus",
  // 추가로 고를 수 있는 것
  "car",
  "fuel",
  "plane",
  "baby",
  "dog",
  "book-open",
  "graduation-cap",
  "dumbbell",
  "shirt",
  "scissors",
  "heart",
  "piggy-bank",
  "landmark",
  "receipt",
  "wifi",
  "zap",
  "droplet",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

/** 화면 읽기 프로그램용 한국어 이름 */
export const CATEGORY_ICON_LABELS: Record<CategoryIconName, string> = {
  utensils: "식기",
  coffee: "커피",
  bike: "배달 오토바이",
  "shopping-cart": "장바구니",
  house: "집",
  smartphone: "휴대폰",
  bus: "버스",
  "shopping-bag": "쇼핑백",
  pill: "약",
  shield: "방패",
  "square-play": "재생",
  gift: "선물",
  film: "영화",
  "train-front": "기차",
  "circle-ellipsis": "기타",
  wallet: "지갑",
  coins: "동전",
  "undo-2": "되돌리기",
  "circle-plus": "더하기",
  car: "자동차",
  fuel: "주유",
  plane: "비행기",
  baby: "아기",
  dog: "반려동물",
  "book-open": "책",
  "graduation-cap": "학업",
  dumbbell: "운동",
  shirt: "옷",
  scissors: "미용",
  heart: "하트",
  "piggy-bank": "저금통",
  landmark: "은행",
  receipt: "영수증",
  wifi: "인터넷",
  zap: "전기",
  droplet: "물",
};

export function isCategoryIconName(value: string): value is CategoryIconName {
  return (CATEGORY_ICON_NAMES as readonly string[]).includes(value);
}
