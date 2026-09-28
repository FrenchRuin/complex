"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { idSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const idsSchema = z.array(idSchema).max(100);

/** 알림 읽음 표시 (F-17). ids를 안 주면 안 읽은 알림 전부. RLS로 내 알림만 바뀐다. */
export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const parsed = idsSchema.optional().safeParse(ids);
  if (!parsed.success) return fail("알림을 찾을 수 없어요. 새로고침해 주세요");

  await requireMember();
  const supabase = await createClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (parsed.data) query = query.in("id", parsed.data);
  const { error } = await query;
  if (error) return fail("읽음 표시를 하지 못했어요. 잠시 후 다시 시도해 주세요");

  revalidatePath("/", "layout");
  return ok();
}
