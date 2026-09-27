import { expect, test } from "@playwright/test";
import { login } from "./support/login";

const MESSAGES = [
  "[Web발신]\n삼성1234승인 김*수\n45,000원 일시불\n09/26 19:20 E2E이마트 성수점\n누적1,500,000원",
  "[Web발신]\n하나카드(5*6*) 취소\n김*수님 12,000원\n09/22 10:30 E2E쿠팡",
  "[토스] 9월 19일 13:05 E2E메가박스 16,000원 결제 완료",
].join("\n\n");

test("문자로 추가: 붙여넣기 → 인식 → 취소 문자는 기본 해제 → 저장 → 다시 붙이면 중복 표시 (F-15)", async ({ page }) => {
  await login(page, "a", "/transactions?month=2026-09");

  await page.getByRole("button", { name: "내역 추가" }).first().click();
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByRole("tab", { name: "문자로 추가" }).click();
  await panel.getByLabel(/알림 문자를 여러 건/).fill(MESSAGES);
  await panel.getByRole("button", { name: "인식하기" }).click();

  const list = panel.getByRole("list", { name: "인식한 문자" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByText("취소 문자 · 환불로 기록")).toBeVisible();
  // 취소 문자는 기본 해제 → 2건
  await expect(panel.getByRole("button", { name: "2건 저장" })).toBeVisible();
  await panel.getByRole("button", { name: "2건 저장" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByText("2건 저장했어요")).toBeVisible();
  await expect(page.getByRole("button", { name: /E2E이마트 성수점/ })).toContainText("45,000원");

  // 같은 문자를 다시 붙이면 중복 경고
  await page.getByRole("button", { name: "내역 추가" }).first().click();
  await panel.getByRole("tab", { name: "문자로 추가" }).click();
  await panel.getByLabel(/알림 문자를 여러 건/).fill(MESSAGES);
  await panel.getByRole("button", { name: "인식하기" }).click();
  await expect(list.getByText("이미 있는 내역 같아요")).toHaveCount(2);
  await expect(panel.getByRole("button", { name: "0건 저장" })).toBeDisabled();
});

test("직접 입력: 가맹점을 쓰면 카테고리가 자동으로 골라진다 (F-16)", async ({ page }) => {
  await login(page, "a", "/transactions");
  await page.keyboard.press("n");
  const panel = page.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("가맹점·내용 (선택)").fill("스타벅스 역삼점");
  await expect(panel.getByRole("radio", { name: "카페·간식" })).toHaveAttribute("aria-checked", "true");

  // 저장하면 규칙을 기억: 같은 가맹점을 식비로 저장한 뒤 다시 쓰면 식비
  await panel.getByRole("radio", { name: "식비" }).click();
  await panel.getByLabel("금액").fill("6000");
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();

  await page.keyboard.press("n");
  await panel.getByLabel("가맹점·내용 (선택)").fill("스타벅스 역삼점");
  await expect(panel.getByRole("radio", { name: "식비" })).toHaveAttribute("aria-checked", "true");
});
