/**
 * 목록 순서 변경 (카테고리, 결제수단).
 * 한 칸 위/아래로 옮긴 뒤 1부터 다시 번호를 매기고, 번호가 바뀐 항목만 돌려준다.
 */

export type Ordered = { id: string; sort_order: number };
export type MoveDirection = "up" | "down";

export function moveItem(items: readonly Ordered[], id: string, direction: MoveDirection): Ordered[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const from = sorted.findIndex((item) => item.id === id);
  const to = direction === "up" ? from - 1 : from + 1;

  if (from === -1 || to < 0 || to >= sorted.length) return [];

  [sorted[from], sorted[to]] = [sorted[to], sorted[from]];

  return sorted
    .map((item, index) => ({ id: item.id, sort_order: index + 1, before: item.sort_order }))
    .filter((item) => item.sort_order !== item.before)
    .map(({ id: itemId, sort_order }) => ({ id: itemId, sort_order }));
}

/** 새 항목의 순서 번호: 맨 뒤 */
export function nextSortOrder(items: readonly Ordered[]): number {
  return items.reduce((max, item) => Math.max(max, item.sort_order), 0) + 1;
}
