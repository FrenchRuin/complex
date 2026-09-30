import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("대출 계산: 우리 정보·기존 대출 저장, 매매·전세 후보 결과, 삭제 되돌리기 (F-43)", async ({ page }) => {
  await login(page, "a", "/loans");
  await expect(page.getByRole("heading", { level: 1, name: "대출" })).toBeVisible();
  await expect(page.getByText("참고용 계산이에요")).toBeVisible();

  // 우리 정보 저장 → 새로고침해도 남는다
  const profile = page.getByRole("form", { name: "우리 정보" });
  await profile.getByLabel(/연소득/).first().fill("60000000");
  await profile.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했어요")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("form", { name: "우리 정보" }).getByLabel(/연소득/).first()).toHaveValue("60,000,000");

  // 기존 대출: 신용대출 1,000만 원 5% → 1년에 갚는 돈 250만 원
  await page.getByRole("button", { name: "기존 대출 추가" }).click();
  const debt = page.getByRole("dialog", { name: "기존 대출 추가" });
  await debt.getByLabel("이름").fill("E2E 신용");
  await debt.getByLabel("잔액").fill("10000000");
  await debt.getByLabel("금리 (%)").fill("5");
  await debt.getByRole("button", { name: "저장" }).click();
  await expect(debt).toBeHidden();
  await expect(page.getByText("2,500,000원")).toBeVisible();

  // 매매 후보
  await page.getByRole("button", { name: "매매 후보 추가" }).click();
  const buy = page.getByRole("dialog", { name: "매매 후보 추가" });
  await buy.getByLabel("이름").fill("E2E 지방 아파트");
  await buy.getByLabel("집값").fill("500000000");
  await buy.getByRole("combobox", { name: "지역" }).click();
  await page.getByRole("option", { name: "지방", exact: true }).click();
  await buy.getByLabel("예상 금리 (%, 선택)").fill("4");
  await buy.getByRole("button", { name: "저장" }).click();
  await expect(buy).toBeHidden();
  const buyCard = page.getByRole("listitem", { name: "E2E 지방 아파트" });
  await expect(buyCard).toContainText("가장 많이 빌릴 수 있어요");
  // 신용대출(1년 250만 원)만큼 DSR 여유가 줄어 LTV 3.5억보다 먼저 DSR에서 막힌다
  await expect(buyCard).toContainText("343,460,000원");
  await expect(buyCard).toContainText("DSR 40%에서 막혀요");
  await expect(buyCard).toContainText("320,000,000원");
  await expect(buyCard).toContainText("생애최초일 때만 받을 수 있어요");

  // 전세 후보
  await page.getByRole("group", { name: "집 후보 종류" }).getByText("전세", { exact: true }).click();
  await page.getByRole("button", { name: "전세 후보 추가" }).click();
  const jeonse = page.getByRole("dialog", { name: "전세 후보 추가" });
  await jeonse.getByLabel("이름").fill("E2E 전세");
  await jeonse.getByLabel("보증금").fill("300000000");
  await jeonse.getByRole("button", { name: "저장" }).click();
  await expect(jeonse).toBeHidden();
  const jeonseCard = page.getByRole("listitem", { name: "E2E 전세" });
  await expect(jeonseCard).toContainText("240,000,000원");
  await expect(jeonseCard).toContainText("760,000원");
  await expect(jeonseCard).toContainText("400,000원");

  // 삭제 → 되돌리기
  await jeonseCard.getByRole("button", { name: "E2E 전세 수정" }).click();
  const edit = page.getByRole("dialog", { name: "전세 후보 수정" });
  await edit.getByRole("button", { name: "삭제" }).click();
  await edit.getByRole("button", { name: "한 번 더 누르면 삭제돼요" }).click();
  await expect(page.getByRole("listitem", { name: "E2E 전세" })).toHaveCount(0);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByRole("listitem", { name: "E2E 전세" })).toBeVisible();
});

test("대출 기준값: 고치면 결과가 바뀌고 조사값으로 되돌린다 (F-43)", async ({ page }) => {
  await login(page, "a", "/loans/rules");
  const bank = page.getByRole("form", { name: "은행 전세대출 기준값" });
  await bank.getByLabel("보증금 대비 (%)").fill("70");
  await bank.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("은행 전세대출 기준값을 저장했어요")).toBeVisible();

  await page.getByRole("link", { name: "대출로 돌아가기" }).click();
  await page.getByRole("group", { name: "집 후보 종류" }).getByText("전세", { exact: true }).click();
  await expect(page.getByRole("listitem", { name: "E2E 전세" })).toContainText("보증금의 70%예요");

  await page.goto("/loans/rules");
  await page.getByRole("form", { name: "은행 전세대출 기준값" }).getByRole("button", { name: "조사값으로 되돌리기" }).click();
  await expect(page.getByText("은행 전세대출을(를) 조사값으로 되돌렸어요")).toBeVisible();
});
