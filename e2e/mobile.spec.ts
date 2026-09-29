import { expect, test } from "@playwright/test";
import { readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

test("모바일: 하단 탭바와 추가 버튼, 바텀시트", async ({ page }) => {
  await login(page, "b", "/");
  const tabs = page.getByRole("navigation", { name: "메뉴" });
  await expect(tabs.getByRole("link", { name: /내역/ })).toBeVisible();
  await tabs.getByRole("link", { name: /내역/ }).click();
  await expect(page).toHaveURL(/\/transactions/);

  await page.getByRole("button", { name: "내역 추가" }).click();
  await expect(page.getByRole("dialog", { name: "내역 추가" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "내역 추가" })).toBeHidden();
});

test("모바일: ☰ 메뉴로 탭바에 없는 메모·자산·목표에 간다", async ({ page }) => {
  await login(page, "b", "/");
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  const menu = page.getByRole("dialog", { name: "메뉴" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "메모" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(menu).toBeHidden();

  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.getByRole("dialog", { name: "메뉴" }).getByRole("link", { name: "자산·목표" }).click();
  await expect(page).toHaveURL(/\/assets$/);

  // 메뉴 안 "내역 추가"는 메뉴를 닫고 내역 창을 연다
  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await page.getByRole("dialog", { name: "메뉴" }).getByRole("button", { name: "내역 추가" }).click();
  await expect(page.getByRole("dialog", { name: "내역 추가" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "메뉴" })).toBeHidden();
});

test("모바일: 360px 폰 달력에서 1,000만 원 넘는 금액도 칸을 넘치지 않는다", async ({ page }) => {
  const creds = readCreds();
  const b = await userClient(creds.b.email, creds.b.password);
  const { data: categories } = await b.from("categories").select("id, type, name").in("name", ["식비", "급여"]);
  const food = categories!.find((c) => c.type === "expense")!.id;
  const salary = categories!.find((c) => c.type === "income")!.id;
  const row = (type: string, amount: number, category_id: string) => ({
    type, amount, occurred_on: "2026-08-12", category_id, merchant: "E2E 큰 금액",
    scope: "joint", member_slot: "b", source: "manual",
    household_id: "00000000-0000-0000-0000-000000000000",
    created_by: "00000000-0000-0000-0000-000000000000",
    updated_by: "00000000-0000-0000-0000-000000000000",
  });
  const added = await b.from("transactions").insert([row("expense", 23_456_789, food), row("income", 12_345_000, salary)]).select("id");
  expect(added.error).toBeNull();

  await page.setViewportSize({ width: 360, height: 780 });
  await login(page, "b", "/transactions?month=2026-08");
  const cell = page.getByRole("link", { name: /8월 12일.*지출 23,456,789원/ });
  await expect(cell).toBeVisible();
  // 칸 안의 금액 글자가 칸 폭을 넘지 않는다
  const overflow = await cell.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll("span span")]
      .filter((s) => s.getBoundingClientRect().width > 0)
      .map((s) => {
        const r = s.getBoundingClientRect();
        return { text: s.textContent, left: r.left - box.left, right: box.right - r.right };
      });
  });
  expect(overflow.map((o) => o.text)).toEqual(["2346만", "+1235만"]);
  for (const o of overflow) {
    expect(o.left).toBeGreaterThanOrEqual(-0.5);
    expect(o.right).toBeGreaterThanOrEqual(-0.5);
  }
  await page.screenshot({ path: "test-results/mobile-calendar-360.png" });

  await b.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", added.data!.map((r) => r.id));
});
