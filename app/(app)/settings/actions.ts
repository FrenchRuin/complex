"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { displayNameSchema, firstError } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/** 내 표시 이름 바꾸기 (F-03) */
export async function updateDisplayName(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = displayNameSchema.safeParse(formData.get("displayName") ?? "");
  if (!parsed.success) return fail(firstError(parsed.error));

  const me = await requireMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ display_name: parsed.data })
    .eq("id", me.id);
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return ok();
}

export type InviteResult = ActionResult & { token?: string };

/** 초대 링크 만들기 (F-02) */
export async function createInvite(): Promise<InviteResult> {
  await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite");
  if (error) return fail(dbErrorMessage(error));

  revalidatePath("/", "layout");
  return { ...ok(), token: data };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
