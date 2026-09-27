import { redirect } from "next/navigation";
import { cache } from "react";
import { toSlot, type MemberNames, type Slot } from "./domain";
import { createClient } from "./supabase/server";

export type CurrentMember = {
  id: string;
  userId: string;
  householdId: string;
  slot: Slot;
  displayName: string;
};

export type HouseholdMember = { id: string; slot: Slot; displayName: string };

/** 로그인한 사람의 구성원 정보. 가구가 없으면 null. 요청마다 한 번만 조회한다. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("members")
    .select("id, user_id, household_id, slot, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`구성원 정보를 불러오지 못했어요: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    householdId: data.household_id,
    slot: toSlot(data.slot),
    displayName: data.display_name,
  };
});

/** 가구가 있어야 하는 화면에서 쓴다. 없으면 온보딩으로 보낸다. */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  return member;
}

/** 같은 가구 구성원 (A, B 순) */
export const getHouseholdMembers = cache(async (): Promise<HouseholdMember[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, slot, display_name")
    .order("slot");

  if (error) throw new Error(`구성원 목록을 불러오지 못했어요: ${error.message}`);

  return data.map((m) => ({ id: m.id, slot: toSlot(m.slot), displayName: m.display_name }));
});

export function toMemberNames(members: readonly HouseholdMember[]): MemberNames {
  return {
    a: members.find((m) => m.slot === "a")?.displayName ?? null,
    b: members.find((m) => m.slot === "b")?.displayName ?? null,
  };
}
