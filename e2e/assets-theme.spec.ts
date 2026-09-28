import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("자산·부채 추가 → 순자산, 저축 목표 적립 → 진행률 (F-40, F-42)", async ({ page }) => {
  await login(page, "a", "/assets");
  await expect(page.getByRole("heading", { level: 2, name: "순자산", exact: true })).toBeVisible();

  const add = async (name: string, amount: string, kind?: string) => {
    await page.getByRole("button", { name: "자산·부채 추가" }).click();
    const dialog = page.getByRole("dialog", { name: "자산·부채 추가" });
    await dialog.getByLabel("이름").fill(name);
    if (kind) {
      await dialog.getByRole("combobox", { name: "종류" }).click();
      await page.getByRole("option", { name: kind, exact: true }).click();
    }
    await dialog.getByLabel("금액", { exact: true }).fill(amount);
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog).toBeHidden();
  };
  await add("E2E 통장", "5000000");
  await add("E2E 대출", "2000000", "대출");
  await expect(page.getByText("자산 5,000,000원 − 부채 2,000,000원")).toBeVisible();
  await expect(page.getByText("3,000,000원").first()).toBeVisible();

  // 지난 날짜 금액 기록 → 지금 금액은 그대로, 추이 표에 지난달이 생긴다 (F-41)
  await page.getByRole("button", { name: /E2E 통장/ }).click();
  const edit = page.getByRole("dialog", { name: "자산·부채 수정" });
  await edit.getByLabel("새 금액").fill("4000000");
  await edit.getByRole("button", { name: /기준일/ }).click();
  await page.getByRole("button", { name: "이전 달" }).click();
  await page.getByRole("group", { name: /날짜/ }).getByRole("button", { name: /^\d+월 15일/ }).click();
  await edit.getByRole("button", { name: "금액 기록 추가" }).click();
  await expect(edit.getByRole("listitem")).toHaveCount(2);
  await edit.getByRole("button", { name: "닫기" }).click();
  await expect(page.getByText("자산 5,000,000원 − 부채 2,000,000원")).toBeVisible();
  await page.getByText("표로 보기").click();
  await expect(page.getByRole("table")).toContainText("4,000,000원");

  await page.getByRole("button", { name: "저축 목표 추가" }).click();
  const goalDialog = page.getByRole("dialog", { name: "저축 목표 추가" });
  await goalDialog.getByLabel("목표 이름").fill("E2E 여행");
  await goalDialog.getByLabel("목표액").fill("1000000");
  await goalDialog.getByRole("button", { name: "저장" }).click();
  await expect(goalDialog).toBeHidden();

  await page.getByRole("button", { name: "적립" }).first().click();
  const contribute = page.getByRole("dialog", { name: "E2E 여행 적립" });
  await contribute.getByLabel("적립 금액").fill("250000");
  await contribute.getByRole("button", { name: "적립하기" }).click();
  await expect(contribute).toBeHidden();
  await expect(page.getByRole("progressbar", { name: "E2E 여행 진행률" })).toHaveAttribute("aria-valuenow", "25");

  // 홈 카드에도 순자산과 목표가 보인다
  await page.goto("/");
  const card = page.getByRole("main").getByRole("link", { name: /자산·목표/ });
  await expect(card).toContainText("3,000,000원");
  await expect(card).toContainText("E2E 여행");
});

test("화면 모드: 다크를 고르면 바로 바뀌고 새로고침해도 유지, 시스템으로 되돌리기 (F-53)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await login(page, "a", "/settings/theme");
  const html = page.locator("html");

  await page.getByText("다크", { exact: true }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(15, 19, 24)");

  await page.getByText("시스템", { exact: true }).click();
  await expect(html).not.toHaveAttribute("data-theme", /.+/);
});
