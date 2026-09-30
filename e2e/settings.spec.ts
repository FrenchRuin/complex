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
    ["서비스 사용량", "서비스 사용량"],
  ] as const) {
    await menu.getByRole("link", { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    await page.getByRole("link", { name: "설정으로 돌아가기" }).click();
    await expect(menu).toBeVisible();
  }

  // 예산은 설정이 아니라 사이드바 메뉴로 옮겼다 (2026-09-29). 설정은 사이드바 아래 톱니바퀴로
  await expect(menu.getByRole("link", { name: /^예산/ })).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("complementary").getByRole("link", { name: "설정" }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});

test("사이드바: 계좌·카드 목록을 접으면 새로고침해도 접혀 있고, 다시 펼칠 수 있다", async ({ page }) => {
  await login(page, "a", "/");
  const sidebar = page.getByRole("complementary");
  const toggle = sidebar.getByRole("button", { name: /함께 보는 계좌·카드/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar.locator("#sidebar-methods-list")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.locator("#sidebar-methods-list")).toBeHidden();

  await page.reload();
  await expect(sidebar.getByRole("button", { name: /함께 보는 계좌·카드/ })).toHaveAttribute("aria-expanded", "false");

  await sidebar.getByRole("button", { name: /함께 보는 계좌·카드/ }).click();
  await expect(sidebar.locator("#sidebar-methods-list")).toBeVisible();
});

test("웹 사이드바: 접으면 아이콘만 남고 새로고침해도 유지, Ctrl K로 펼치며 검색칸으로", async ({ page }) => {
  await login(page, "a", "/");
  const sidebar = page.getByRole("complementary");
  await sidebar.getByRole("button", { name: "사이드바 접기" }).click();
  await expect(sidebar.getByRole("searchbox")).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "통계" })).toBeVisible();

  await page.reload();
  await expect(sidebar.getByRole("button", { name: "사이드바 펼치기" })).toBeVisible();
  const width = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeLessThan(80);

  // 접힌 상태에서도 메뉴 이동과 내역 추가
  await sidebar.getByRole("link", { name: "통계" }).click();
  await expect(page).toHaveURL(/\/stats/);
  await sidebar.getByRole("button", { name: "내역 추가" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+KeyK");
  await expect(sidebar.getByRole("searchbox")).toBeFocused();
  await expect(sidebar.getByRole("button", { name: "사이드바 접기" })).toBeVisible();
});
