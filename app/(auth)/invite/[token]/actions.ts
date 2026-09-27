"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { dbErrorMessage, fail, type ActionResult } from "@/lib/action-result";
import { displayNameSchema, firstError } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const acceptSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{48}$/, "초대 링크를 찾을 수 없어요. 링크를 다시 받아 주세요"),
  displayName: displayNameSchema,
});

/** 초대 수락 (F-02). 비어 있는 자리(B)로 합류한다. */
export async function acceptInvite(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token") ?? "",
    displayName: formData.get("displayName") ?? "",
  });
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_token: parsed.data.token,
    p_display_name: parsed.data.displayName,
  });
  if (error) return fail(dbErrorMessage(error));

  redirect("/");
}
