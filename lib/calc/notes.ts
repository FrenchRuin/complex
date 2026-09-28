/** 공유 메모 (F-18) 계산: 미리보기, 검색, 체크리스트 진행. */

export type NoteKind = "text" | "checklist";
export type NoteItem = { id: string; text: string; done: boolean };

export type Note = {
  id: string;
  kind: NoteKind;
  body: string;
  items: NoteItem[];
  isPinned: boolean;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
};

/** DB의 items(jsonb)를 안전하게 읽는다. 모양이 이상한 항목은 버린다. */
export function parseNoteItems(raw: unknown): NoteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { id, text, done } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string") return [];
    return [{ id, text, done: done === true }];
  });
}

/**
 * 목록에 보일 제목과 한 줄 요약.
 * 제목: 글의 첫 줄, 없으면 첫 항목, 그것도 없으면 "제목 없는 메모".
 */
export function notePreview(note: Pick<Note, "kind" | "body" | "items">): { title: string; summary: string } {
  const lines = note.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstItem = note.items.find((item) => item.text.trim())?.text.trim();
  const title = lines[0] ?? firstItem ?? "제목 없는 메모";

  if (note.kind === "checklist") {
    const { done, total } = checklistProgress(note.items);
    return { title, summary: total > 0 ? `${total}개 중 ${done}개 완료` : "항목 없음" };
  }
  return { title, summary: lines.slice(1).join(" ") };
}

export function checklistProgress(items: readonly NoteItem[]): { done: number; total: number } {
  const real = items.filter((item) => item.text.trim());
  return { done: real.filter((item) => item.done).length, total: real.length };
}

/** 검색: 글과 항목 글자에서 대소문자·띄어쓰기 무시하고 찾는다 */
export function noteMatches(note: Pick<Note, "body" | "items">, query: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const q = normalize(query);
  if (!q) return true;
  return normalize([note.body, ...note.items.map((item) => item.text)].join(" ")).includes(q);
}

/** 고정한 메모 먼저, 그다음 최근에 바뀐 순 */
export function sortNotes<T extends Pick<Note, "isPinned" | "updatedAt">>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** 글 메모 ↔ 체크리스트 전환. 줄마다 항목으로, 항목은 줄로 옮겨 내용을 잃지 않는다. */
export function convertNote(
  note: { kind: NoteKind; body: string; items: NoteItem[] },
  to: NoteKind,
  newId: () => string,
): { body: string; items: NoteItem[] } {
  if (note.kind === to) return { body: note.body, items: note.items };
  if (to === "checklist") {
    const lines = note.body.split("\n").map((l) => l.trim()).filter(Boolean);
    // 첫 줄은 제목으로 남기고 나머지를 항목으로
    const [title = "", ...rest] = lines;
    return { body: title, items: rest.map((text) => ({ id: newId(), text, done: false })) };
  }
  const itemLines = note.items.map((item) => item.text.trim()).filter(Boolean);
  return { body: [note.body.trim(), ...itemLines].filter(Boolean).join("\n"), items: [] };
}
