import { describe, expect, it } from "vitest";
import { buildXlsx, toLibraryCell, toLibrarySheets } from "./xlsx";

describe("toLibraryCell", () => {
  it("글자·금액·숫자·빈칸", () => {
    expect(toLibraryCell({ kind: "text", value: "식비" })).toEqual({ value: "식비", type: String });
    expect(toLibraryCell({ kind: "money", value: 12000 })).toEqual({ value: 12000, type: Number, format: "#,##0" });
    expect(toLibraryCell({ kind: "number", value: 4.25 })).toEqual({ value: 4.25, type: Number });
    expect(toLibraryCell(null)).toBeNull();
  });
  it("날짜는 그날 UTC 0시라 엑셀에서 하루 밀리지 않는다", () => {
    expect(toLibraryCell({ kind: "date", value: "2026-09-02" })).toEqual({
      value: new Date(Date.UTC(2026, 8, 2)),
      type: Date,
      format: "yyyy-mm-dd",
    });
  });
});

describe("toLibrarySheets", () => {
  it("첫 줄은 굵은 제목이고 고정, 열 너비를 넘긴다", () => {
    const [s] = toLibrarySheets([
      { name: "내역", columns: [{ title: "날짜", width: 12 }, { title: "금액", width: 14 }], rows: [[null, { kind: "money", value: 5 }]] },
    ]);
    expect(s).toEqual({
      sheet: "내역",
      columns: [{ width: 12 }, { width: 14 }],
      stickyRowsCount: 1,
      data: [
        [
          { value: "날짜", fontWeight: "bold" },
          { value: "금액", fontWeight: "bold" },
        ],
        [null, { value: 5, type: Number, format: "#,##0" }],
      ],
    });
  });
});

describe("buildXlsx", () => {
  it("엑셀(zip) 파일을 만든다", async () => {
    const file = await buildXlsx([
      { name: "내역", columns: [{ title: "날짜", width: 12 }], rows: [] },
      { name: "자산", columns: [{ title: "이름", width: 12 }], rows: [[{ kind: "text", value: "통장" }]] },
    ]);
    expect(file.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(file.toString("latin1")).toContain("xl/worksheets/sheet2.xml");
  });
});
