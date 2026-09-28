import { redirect } from "next/navigation";
import { cache } from "react";
import { toSlot, type MemberNames, type Slot } from "./domain";
import { getSupabaseEnv } from "./supabase/env";
import { createClient } from "./supabase/server";

export type CurrentMember = {
  id: string;
  userId: string;
  householdId: string;
  slot: Slot;
  displayName: string;
  avatarUrl: string | null;
};

export type HouseholdMember = { id: string; slot: Slot; displayName: string; avatarUrl: string | null };

/** avatars 버킷은 공개라 경로만 있으면 바로 접근 가능한 URL을 만든다 */
function toAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  return `${getSupabaseEnv().url}/storage/v1/object/public/avatars/${path}`;
}

/** 로그인한 사람의 구성원 정보. 가구가 없으면 null. 요청마다 한 번만 조회한다. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient();
  // getClaims: 로그인 토큰(ES256) 서명을 서버에서 공개키로 검증한다.
  // getUser와 달리 매번 Supabase에 묻지 않아 왕복 한 번을 줄인다.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("members")
    .select("id, user_id, household_id, slot, display_name, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`구성원 정보를 불러오지 못했어요: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    householdId: data.household_id,
    slot: toSlot(data.slot),
    displayName: data.display_name,
    avatarUrl: toAvatarUrl(data.avatar_path),
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
    .select("id, slot, display_name, avatar_path")
    .order("slot");

  if (error) throw new Error(`구성원 목록을 불러오지 못했어요: ${error.message}`);

  return data.map((m) => ({
    id: m.id,
    slot: toSlot(m.slot),
    displayName: m.display_name,
    avatarUrl: toAvatarUrl(m.avatar_path),
  }));
});

export function toMemberNames(members: readonly HouseholdMember[]): MemberNames {
  return {
    a: members.find((m) => m.slot === "a")?.displayName ?? null,
    b: members.find((m) => m.slot === "b")?.displayName ?? null,
  };
}
