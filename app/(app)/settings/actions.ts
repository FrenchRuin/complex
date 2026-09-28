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

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** 프로필 사진 올리기 (F-03 개선). 새로 올릴 때마다 새 파일이고, 이전 파일은 지운다 */
export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("사진 파일을 골라 주세요");
  if (!AVATAR_TYPES.includes(file.type)) return fail("jpg, png, webp 파일만 올릴 수 있어요");
  if (file.size > AVATAR_MAX_BYTES) return fail("사진은 5MB까지 올릴 수 있어요");

  const me = await requireMember();
  const supabase = await createClient();

  const { data: before } = await supabase.from("members").select("avatar_path").eq("id", me.id).maybeSingle();

  const path = `${me.id}-${Date.now()}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type,
  });
  if (uploadError) return fail(`사진을 올리지 못했어요: ${uploadError.message}`);

  const { error } = await supabase.from("members").update({ avatar_path: path }).eq("id", me.id);
  if (error) return fail(dbErrorMessage(error));

  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);

  revalidatePath("/", "layout");
  return ok();
}

/** 프로필 사진 지우기 */
export async function removeAvatar(): Promise<ActionResult> {
  const me = await requireMember();
  const supabase = await createClient();

  const { data: before } = await supabase.from("members").select("avatar_path").eq("id", me.id).maybeSingle();
  const { error } = await supabase.from("members").update({ avatar_path: null }).eq("id", me.id);
  if (error) return fail(dbErrorMessage(error));

  if (before?.avatar_path) await supabase.storage.from("avatars").remove([before.avatar_path]);

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
