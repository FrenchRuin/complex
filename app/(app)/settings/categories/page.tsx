import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorySettings } from "@/components/settings/category-settings";

export default async function CategoriesSettingsPage() {
  const profile = await requireProfile();

  const rawCategories = await prisma.category.findMany({
    where: { coupleId: profile.coupleId },
    orderBy: { name: "asc" },
  });

  const categories = rawCategories.map((c) => ({
    ...c,
    type: (c.type === "income" ? "income" : "expense") as "income" | "expense",
  }));

  return (
    <div className="flex w-full flex-col gap-6 p-6 md:p-10">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <div className="mb-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold">
          <Link href="/settings" className="text-ink-muted">
            설정
          </Link>
          <ChevronRight className="size-3" strokeWidth={2.5} />
          <span className="text-ink-secondary">카테고리 관리</span>
        </div>
        <h1 className="font-heading text-[28px] font-bold text-foreground md:text-[32px]">
          카테고리 관리
        </h1>
        <p className="text-[14.5px] text-ink-secondary">
          식비, 교통 같은 카테고리를 자유롭게 추가하고 관리하세요.
        </p>
      </div>

      <div className="max-w-2xl">
        <CategorySettings categories={categories} />
      </div>
    </div>
  );
}
