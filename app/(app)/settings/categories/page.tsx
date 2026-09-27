import type { Metadata } from "next";
import { CategorySection } from "@/components/settings/CategorySection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { requireMember } from "@/lib/household";
import { getAllCategories } from "@/lib/settings-data";

export const metadata: Metadata = { title: "카테고리 · 설정 · 우리 둘 가계부" };

export default async function CategorySettingsPage() {
  await requireMember();
  const categories = await getAllCategories();
  return (
    <SettingsSubpage title="카테고리">
      <CategorySection categories={categories} />
    </SettingsSubpage>
  );
}
