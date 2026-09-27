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
