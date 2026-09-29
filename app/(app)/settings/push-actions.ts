"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireMember } from "@/lib/household";
import { sendTestPush } from "@/lib/push-server";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  device: z.string().max(60),
});

/** 이 폰의 알림 주소 저장 (F-57). 같은 주소가 이미 있으면 새로 고친다 */
export async function savePushSubscription(input: z.input<typeof subscriptionSchema>): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("알림 주소가 올바르지 않아요. 다시 켜 주세요");
  const me = await requireMember();
  const supabase = await createClient();
  const { endpoint, keys, device } = parsed.data;

  // 같은 폰에서 다시 켜면 예전 줄을 지우고 새로 넣는다 (주소가 바뀌었을 수 있음)
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    device,
    member_id: me.id,
    household_id: me.householdId,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/settings/push");
  revalidatePath("/settings");
  return ok();
}

/** 이 폰(또는 목록의 기기) 알림 끄기 */
export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  if (!endpoint.startsWith("https://")) return fail("잘못된 요청이에요. 새로고침해 주세요");
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/settings/push");
  revalidatePath("/settings");
  return ok();
}

/** 내 모든 기기로 시험 알림 */
export async function sendTestPushAction(): Promise<ActionResult & { sent?: number }> {
  const me = await requireMember();
  try {
    const sent = await sendTestPush(me.id);
    if (sent === 0) return fail("알림을 받을 기기가 없어요. 이 폰에서 먼저 알림을 켜 주세요");
    return { ...ok(), sent };
  } catch {
    return fail("시험 알림을 보내지 못했어요. 잠시 후 다시 시도해 주세요");
  }
}
