import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  return { user, profile };
});

export async function requireProfile() {
  const { profile } = await getSessionProfile();

  if (!profile || !profile.coupleId) {
    throw new Error(
      "이 계정에 연결된 Couple이 없습니다. scripts/link-couple.ts를 먼저 실행해주세요.",
    );
  }

  return { ...profile, coupleId: profile.coupleId };
}
