import { expect, test } from "@playwright/test";
import { E2E_NAMES, readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

test("오늘 기분: A가 고르면 홈·사이드바에 보이고 B에게 알림, 지우면 사라진다 (F-04)", async ({ browser }) => {
  const creds = readCreds();
  await (await userClient(creds.a.email, creds.a.password)).rpc("clear_my_mood");
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await login(pageA, "a", "/");
  await login(pageB, "b", "/");

  const bellB = pageB.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await bellB.click();
  const markAll = pageB.getByRole("dialog").getByRole("button", { name: "모두 읽음" });
  if (await markAll.isEnabled()) await markAll.click();
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");

  // A: 홈에 아직 안 정함 → 사이드바 아래 내 프로필에서 고르기
  const homeMoods = pageA.getByRole("region", { name: "오늘 기분" });
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("아직 안 정했어요");
  const myRow = pageA.getByRole("complementary").getByRole("button", { name: /오늘 기분 고르기/ });
  await expect(myRow).toHaveAccessibleName(/지금 아직 안 정했어요/);
  await myRow.click();
  const picker = pageA.getByRole("dialog", { name: "오늘 기분" });
  await expect(picker.getByRole("button", { name: "저장" })).toBeDisabled();
  await picker.getByRole("radio", { name: "피곤해요" }).click();
  await picker.getByLabel("한 줄 (선택)").fill("야근 중");
  await picker.getByRole("button", { name: "저장" }).click();
  await expect(picker).toBeHidden();
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("😴 피곤해요 · 야근 중");

  // 사이드바 위 아바타 배지는 누구 기분인지 읽어 준다
  await expect(pageA.getByRole("complementary").getByText(`${E2E_NAMES.a} 기분 피곤해요`)).toBeAttached();

  // B: 새로고침 없이 홈과 알림
  await expect(
    pageB.getByRole("region", { name: "오늘 기분" }).getByRole("listitem").filter({ hasText: E2E_NAMES.a }),
  ).toContainText("😴 피곤해요 · 야근 중", { timeout: 8000 });
  await expect(bellB).toHaveAccessibleName("알림, 안 읽은 알림 1건", { timeout: 8000 });
  await bellB.click();
  await expect(
    pageB.getByRole("link", { name: new RegExp(`${E2E_NAMES.a}님이 오늘 기분을 😴 피곤해요로 정했어요 · 야근 중`) }),
  ).toBeVisible();
  await pageB.keyboard.press("Escape");

  // A: 홈의 내 칸을 눌러 지우기
  await homeMoods.getByRole("button", { name: /오늘 기분 고르기/ }).click();
  await pageA.getByRole("dialog", { name: "오늘 기분" }).getByRole("button", { name: "기분 지우기" }).click();
  await expect(homeMoods.getByRole("listitem").filter({ hasText: E2E_NAMES.a })).toContainText("아직 안 정했어요");

  await contextA.close();
  await contextB.close();
});
