import { expect, test } from "@playwright/test";

test("로그인 안 하면 로그인 화면으로 보낸다", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login\?next=%2Ftransactions/);
});

test("허용되지 않은 이메일은 막는다 (F-01)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("이메일").fill("stranger@example.com");
  await page.getByLabel("비밀번호").fill("whatever123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("초대받은 계정만 사용할 수 있어요")).toBeVisible();
});
