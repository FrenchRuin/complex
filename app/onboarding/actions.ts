"use server";

import { redirect } from "next/navigation";
import { dbErrorMessage, fail, type ActionResult } from "@/lib/action-result";
import { displayNameSchema, firstError } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/** 가구 만들기 (F-02). 만든 사람이 A가 된다. */
export async function createHousehold(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = displayNameSchema.safeParse(formData.get("displayName") ?? "");
  if (!parsed.success) return fail(firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_household", { p_display_name: parsed.data });
  if (error) return fail(dbErrorMessage(error));

  redirect("/");
}
