import { describe, expect, it } from "vitest";
import { fetchAll, PAGE_SIZE } from "./fetch-all";

const pager = (rows: number[], calls: [number, number][]) => async (from: number, to: number) => {
  calls.push([from, to]);
  return { data: rows.slice(from, to + 1), error: null };
};

describe("fetchAll", () => {
  it("1000줄 제한을 넘어도 끝까지 이어서 읽는다", async () => {
    const rows = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) => i);
    const calls: [number, number][] = [];
    expect(await fetchAll("내역", pager(rows, calls))).toEqual(rows);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });
  it("딱 1000줄이면 빈 쪽을 한 번 더 읽고 끝낸다", async () => {
    const rows = Array.from({ length: PAGE_SIZE }, (_, i) => i);
    const calls: [number, number][] = [];
    expect(await fetchAll("내역", pager(rows, calls))).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });
  it("오류면 무엇을 못 읽었는지와 원인을 담아 던진다", async () => {
    await expect(fetchAll("자산", async () => ({ data: null, error: { message: "권한 없음" } }))).rejects.toThrow(
      "자산을(를) 불러오지 못했어요: 권한 없음",
    );
  });
});
