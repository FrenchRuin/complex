import { expect, test } from "@playwright/test";
import { readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

const todayKST = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());

test("공휴일: 기본 목록, 쉬는 날 아님·다시 쉬는 날로, 직접 추가 → 일정 달력에 표시, 삭제·되돌리기 (F-55)", async ({ page }) => {
  await login(page, "a", "/settings");
  await page.getByRole("navigation", { name: "설정 메뉴" }).getByRole("link", { name: /^공휴일/ }).click();
  await expect(page).toHaveURL(/\/settings\/holidays$/);

  // 2026년 기본 공휴일 (정부 월력요항): 추석, 개천절
  await page.goto("/settings/holidays?year=2026");
  const list = page.getByRole("region", { name: "공휴일 목록" });
  await expect(list).toContainText("추석");
  const foundation = list.getByRole("listitem").filter({ hasText: /^개천절/ });
  await foundation.getByRole("button", { name: /쉬는 날 아님$/ }).click();
  await expect(foundation).toContainText("쉬는 날 아님");
  await foundation.getByRole("button", { name: /다시 쉬는 날로$/ }).click();
  await expect(foundation.getByRole("button", { name: /쉬는 날 아님$/ })).toBeVisible();

  // 오늘 날짜로 직접 추가 → 일정 달력(오늘 선택)에 공휴일 이름
  await page.goto("/settings/holidays");
  await page.getByLabel("이름").fill("E2E 휴무");
  await page.getByRole("button", { name: "공휴일 추가" }).click();
  await expect(page.getByText("공휴일을 추가했어요")).toBeVisible();
  const added = page.getByRole("region", { name: "공휴일 목록" }).getByRole("listitem").filter({ hasText: "E2E 휴무" });
  await expect(added).toContainText("직접 추가");

  await page.goto("/schedule");
  await expect(page.getByRole("region", { name: /월 \d+일/ })).toContainText("공휴일 · E2E 휴무");
  await expect(page.getByRole("button", { name: /E2E 휴무/ })).toBeVisible();

  // 지난 추석은 9월 달력에 이름과 함께
  await page.goto("/schedule?month=2026-09");
  await expect(page.getByRole("button", { name: /9월 25일.*추석/ })).toBeVisible();

  // 삭제 → 되돌리기 → 다시 삭제
  await page.goto("/settings/holidays");
  await added.getByRole("button", { name: /삭제$/ }).click();
  await expect(added).toHaveCount(0);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(added).toHaveCount(1);
  await added.getByRole("button", { name: /삭제$/ }).click();
  await expect(added).toHaveCount(0);
});

test("공휴일 규칙: 가구는 DB가 채움, 같은 날짜는 하나만, 추가는 이름 필수, 진짜 삭제 막기 (F-55)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  const fake = "00000000-0000-0000-0000-000000000000";
  const date = "2031-03-10";

  const { data: row, error } = await a
    .from("custom_holidays")
    .insert({ date, kind: "add", name: " E2E 규칙 ", household_id: fake, created_by: fake })
    .select("id, household_id, name")
    .single();
  expect(error).toBeNull();
  expect(row!.household_id).not.toBe(fake);
  expect(row!.name).toBe("E2E 규칙");

  // 같은 가구의 상대도 보이고, 같은 날짜는 하나만
  const { data: seen } = await b.from("custom_holidays").select("id").eq("id", row!.id);
  expect(seen).toHaveLength(1);
  const dup = await b.from("custom_holidays").insert({ date, kind: "remove", household_id: fake, created_by: fake });
  expect(dup.error).not.toBeNull();

  const noName = await a.from("custom_holidays").insert({ date: "2031-03-11", kind: "add", household_id: fake, created_by: fake });
  expect(noName.error).not.toBeNull();

  const hardDelete = await a.from("custom_holidays").delete().eq("id", row!.id);
  expect(hardDelete.error).not.toBeNull();
  await a.from("custom_holidays").update({ deleted_at: new Date().toISOString() }).eq("id", row!.id);
  // 지운 뒤에는 같은 날짜에 다시 넣을 수 있다
  const again = await a.from("custom_holidays").insert({ date, kind: "add", name: "E2E 다시", household_id: fake, created_by: fake });
  expect(again.error).toBeNull();
  expect(todayKST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("최신 공휴일 받기: 인터넷 공휴일 파일을 받아 저장하고, 마지막으로 받은 날을 보여준다 (F-55)", async ({ page }) => {
  await login(page, "a", "/settings/holidays?year=2026");
  await page.getByRole("button", { name: "최신 공휴일 받기" }).click();
  // 앱에 들어 있는 해만 있으면 "이미 최신", 새 해가 발표됐으면 "새로 받았어요"
  await expect(page.getByText(/이미 최신이에요 \(2018~\d{4}년\)|\d{4}년 공휴일을 새로 받았어요/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/마지막으로 받은 날: \d{4}년/)).toBeVisible();
  // 받은 뒤에도 목록은 그대로 (추석)
  await expect(page.getByRole("region", { name: "공휴일 목록" })).toContainText("추석");
});
