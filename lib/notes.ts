import { cache } from "react";
import { parseNoteItems, sortNotes, type Note, type NoteKind } from "./calc/notes";
import { createClient } from "./supabase/server";

/** 우리 가구의 메모 (F-18). 지운 것 빼고, 고정 먼저·최근 순. */
export const getNotes = cache(async (): Promise<Note[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, kind, body, items, is_pinned, created_by, updated_by, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(`메모를 불러오지 못했어요: ${error.message}`);

  return sortNotes(
    data.map((n) => ({
      id: n.id,
      kind: (n.kind === "checklist" ? "checklist" : "text") as NoteKind,
      body: n.body,
      items: parseNoteItems(n.items),
      isPinned: n.is_pinned,
      createdBy: n.created_by,
      updatedBy: n.updated_by,
      updatedAt: n.updated_at,
    })),
  );
});
