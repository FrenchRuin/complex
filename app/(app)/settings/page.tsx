import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorySettings } from "@/components/settings/category-settings";

export default async function SettingsPage() {
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
    <div className="flex w-full flex-col gap-8 p-6">
      <h1 className="font-heading text-lg font-medium">설정</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">카테고리</h2>
        <CategorySettings categories={categories} />
      </section>
    </div>
  );
}
