"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { firstError, idSchema, noteInputSchema, type NoteInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/notes");
  revalidatePath("/");
}

/** 메모 쓰기·고치기 (F-18). 가구·작성자는 DB가 채운다. 새 메모면 id를 돌려준다. */
export async function saveNote(input: NoteInput): Promise<ActionResult & { id?: string }> {
  const parsed = noteInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const { id, kind, body, items } = parsed.data;
  const values = { kind, body, items: kind === "checklist" ? items : [] };

  if (id) {
    const { error } = await supabase.from("notes").update(values).eq("id", id).is("deleted_at", null);
    if (error) return fail(dbErrorMessage(error));
    refresh();
    return { ...ok(), id };
  }

  const { data, error } = await supabase
    .from("notes")
    // 트리거가 로그인한 사람 기준으로 다시 채운다 (화면 값은 믿지 않음)
    .insert({ ...values, household_id: me.householdId, created_by: me.id, updated_by: me.id })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ...ok(), id: data.id };
}

/** 고정·고정 풀기 */
export async function setNotePinned(id: string, pinned: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("메모를 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("notes").update({ is_pinned: pinned }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}

/** 지우기(소프트 삭제)·되돌리기 */
export async function setNoteDeleted(id: string, deleted: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return fail("메모를 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}

const toggleSchema = z.object({ noteId: idSchema, itemId: z.string().min(1).max(40), done: z.boolean() });

/** 체크리스트 항목 하나 체크·해제 (알림 없음). 두 사람이 동시에 체크해도 서로 덮어쓰지 않는다. */
export async function toggleNoteItem(noteId: string, itemId: string, done: boolean): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse({ noteId, itemId, done });
  if (!parsed.success) return fail("메모를 찾을 수 없어요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_note_item", {
    p_note_id: parsed.data.noteId,
    p_item_id: parsed.data.itemId,
    p_done: parsed.data.done,
  });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok();
}
