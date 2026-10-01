import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { login } from "./support/login";

test("로그인 안 하면 내보내기 주소는 로그인 화면으로 보낸다 (F-52)", async ({ request }) => {
  const res = await request.get("/api/export", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers()["location"]).toContain("/login");
});

test("설정 → 데이터 내보내기: 시트 11장짜리 엑셀 백업을 받는다 (F-52)", async ({ page }) => {
  await login(page, "a", "/settings");
  await page.getByRole("link", { name: /데이터 내보내기/ }).click();
  await expect(page).toHaveURL(/\/settings\/export$/);
  await expect(page.getByText("시트 11장")).toBeVisible();

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "엑셀로 내보내기" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^감자밭-백업-\d{4}-\d{2}-\d{2}\.xlsx$/);

  // xlsx는 zip이고, 압축 안 된 파일 목록에 시트 파일 이름이 그대로 들어 있다
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
  const listing = bytes.toString("latin1");
  for (let i = 1; i <= 11; i++) expect(listing).toContain(`xl/worksheets/sheet${i}.xml`);
  expect(listing).not.toContain("xl/worksheets/sheet12.xml");
});
