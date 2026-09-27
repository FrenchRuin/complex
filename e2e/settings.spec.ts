import { expect, test } from "@playwright/test";
import { E2E_NAMES } from "./support/accounts";
import { login } from "./support/login";

test("설정: 메뉴 목록에서 각 화면으로 가고 돌아온다", async ({ page }) => {
  await login(page, "a", "/settings");
  const menu = page.getByRole("navigation", { name: "설정 메뉴" });
  await expect(menu.getByRole("link", { name: /프로필/ })).toContainText(E2E_NAMES.a);
  await expect(menu.getByRole("link", { name: /가구·초대/ })).toContainText(E2E_NAMES.b);

  for (const [label, heading] of [
    ["프로필", "표시 이름"],
    ["가구·초대", "가구"],
    ["카테고리", "카테고리"],
    ["계좌·카드", "계좌·카드"],
    ["예산", /예산$/],
    ["서비스 사용량", "서비스 사용량"],
  ] as const) {
    await menu.getByRole("link", { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    await page.getByRole("link", { name: "설정으로 돌아가기" }).click();
    await expect(menu).toBeVisible();
  }

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});
