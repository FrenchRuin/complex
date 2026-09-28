import { expect, test } from "@playwright/test";
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
