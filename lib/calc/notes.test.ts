import { describe, expect, it } from "vitest";
import { checklistProgress, convertNote, noteMatches, notePreview, parseNoteItems, sortNotes } from "./notes";

const item = (id: string, text: string, done = false) => ({ id, text, done });

describe("parseNoteItems", () => {
  it("모양이 맞는 항목만 읽는다", () => {
    expect(parseNoteItems([{ id: "1", text: "우유", done: true }, { id: 2 }, null, "x"])).toEqual([item("1", "우유", true)]);
    expect(parseNoteItems(null)).toEqual([]);
  });
});

describe("notePreview", () => {
  it("글 메모: 첫 줄이 제목, 나머지가 요약", () => {
    expect(notePreview({ kind: "text", body: "\n 주말 계획 \n토요일 장보기\n일요일 청소", items: [] })).toEqual({
      title: "주말 계획",
      summary: "토요일 장보기 일요일 청소",
    });
  });

  it("체크리스트: 글이 없으면 첫 항목이 제목, 요약은 진행", () => {
    expect(notePreview({ kind: "checklist", body: "", items: [item("1", "우유", true), item("2", "계란")] })).toEqual({
      title: "우유",
      summary: "2개 중 1개 완료",
    });
  });

  it("아무것도 없으면 제목 없는 메모", () => {
    expect(notePreview({ kind: "text", body: "  ", items: [] }).title).toBe("제목 없는 메모");
  });
});

describe("checklistProgress", () => {
  it("빈 항목은 세지 않는다", () => {
    expect(checklistProgress([item("1", "우유", true), item("2", " "), item("3", "빵")])).toEqual({ done: 1, total: 2 });
  });
});

describe("noteMatches", () => {
  it("글과 항목에서 띄어쓰기·대소문자 무시하고 찾는다", () => {
    const note = { body: "장보기 목록", items: [item("1", "Greek 요거트")] };
    expect(noteMatches(note, "장 보기")).toBe(true);
    expect(noteMatches(note, "greek")).toBe(true);
    expect(noteMatches(note, "치즈")).toBe(false);
    expect(noteMatches(note, " ")).toBe(true);
  });
});

describe("sortNotes", () => {
  it("고정 먼저, 그다음 최근 순", () => {
    const notes = [
      { id: "a", isPinned: false, updatedAt: "2026-09-28T03:00:00Z" },
      { id: "b", isPinned: true, updatedAt: "2026-09-01T00:00:00Z" },
      { id: "c", isPinned: false, updatedAt: "2026-09-28T05:00:00Z" },
    ];
    expect(sortNotes(notes).map((n) => n.id)).toEqual(["b", "c", "a"]);
  });
});

describe("convertNote", () => {
  let n = 0;
  const newId = () => `n${++n}`;

  it("글 → 체크리스트: 첫 줄은 제목, 나머지 줄은 항목", () => {
    expect(convertNote({ kind: "text", body: "장보기\n우유\n\n계란", items: [] }, "checklist", newId)).toEqual({
      body: "장보기",
      items: [item("n1", "우유"), item("n2", "계란")],
    });
  });

  it("체크리스트 → 글: 제목 아래에 항목을 줄로", () => {
    expect(convertNote({ kind: "checklist", body: "장보기", items: [item("1", "우유", true), item("2", "")] }, "text", newId)).toEqual({
      body: "장보기\n우유",
      items: [],
    });
  });

  it("같은 종류면 그대로", () => {
    const note = { kind: "text" as const, body: "그대로", items: [] };
    expect(convertNote(note, "text", newId)).toEqual({ body: "그대로", items: [] });
  });
});
