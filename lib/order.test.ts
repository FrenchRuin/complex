import { describe, expect, it } from "vitest";
import { moveItem, nextSortOrder } from "./order";

const items = [
  { id: "a", sort_order: 1 },
  { id: "b", sort_order: 2 },
  { id: "c", sort_order: 3 },
];

describe("moveItem", () => {
  it("위로 옮기면 앞 항목과 자리를 바꾼다", () => {
    expect(moveItem(items, "b", "up")).toEqual([
      { id: "b", sort_order: 1 },
      { id: "a", sort_order: 2 },
    ]);
  });

  it("아래로 옮기면 뒤 항목과 자리를 바꾼다", () => {
    expect(moveItem(items, "b", "down")).toEqual([
      { id: "c", sort_order: 2 },
      { id: "b", sort_order: 3 },
    ]);
  });

  it("맨 위에서 위로, 맨 아래에서 아래로는 바뀌지 않는다", () => {
    expect(moveItem(items, "a", "up")).toEqual([]);
    expect(moveItem(items, "c", "down")).toEqual([]);
  });

  it("없는 id는 무시한다", () => {
    expect(moveItem(items, "z", "up")).toEqual([]);
  });

  it("번호가 겹치거나 비어 있어도 1부터 다시 매긴다", () => {
    const messy = [
      { id: "a", sort_order: 5 },
      { id: "b", sort_order: 5 },
      { id: "c", sort_order: 9 },
    ];
    expect(moveItem(messy, "c", "up")).toEqual([
      { id: "a", sort_order: 1 },
      { id: "c", sort_order: 2 },
      { id: "b", sort_order: 3 },
    ]);
  });
});

describe("nextSortOrder", () => {
  it("가장 큰 번호 + 1", () => {
    expect(nextSortOrder(items)).toBe(4);
    expect(nextSortOrder([])).toBe(1);
  });
});
