/**
 * 엑셀 파일 만들기 (F-52). 시트(lib/calc/export-sheets.ts) → write-excel-file 형식 → .xlsx Buffer. 서버에서만 쓴다.
 */
import writeXlsxFile, { type Cell } from "write-excel-file/node";
import type { ExportCell, ExportSheet } from "@/lib/calc/export-sheets";

/** 엑셀에서 12,000 */
const MONEY_FORMAT = "#,##0";
const DATE_FORMAT = "yyyy-mm-dd";

export function toLibraryCell(cell: ExportCell): Cell {
  if (cell === null) return null;
  switch (cell.kind) {
    case "text":
      return { value: cell.value, type: String };
    case "money":
      return { value: cell.value, type: Number, format: MONEY_FORMAT };
    case "number":
      return { value: cell.value, type: Number };
    case "date": {
      // 라이브러리는 getTime()으로 일련번호를 만든다. UTC 0시여야 시간대와 관계없이 그날이 된다
      const [y, m, d] = cell.value.split("-").map(Number);
      return { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: DATE_FORMAT };
    }
  }
}

/** 시트마다 첫 줄은 굵은 제목, 스크롤해도 보이게 고정 */
export function toLibrarySheets(sheets: readonly ExportSheet[]) {
  return sheets.map((s) => ({
    sheet: s.name,
    columns: s.columns.map((c) => ({ width: c.width })),
    stickyRowsCount: 1,
    data: [s.columns.map((c): Cell => ({ value: c.title, fontWeight: "bold" })), ...s.rows.map((row) => row.map(toLibraryCell))],
  }));
}

export function buildXlsx(sheets: readonly ExportSheet[]): Promise<Buffer> {
  return writeXlsxFile(toLibrarySheets(sheets)).toBuffer();
}
