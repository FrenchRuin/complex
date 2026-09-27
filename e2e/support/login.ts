import { expect, type Page } from "@playwright/test";
import { readCreds } from "./accounts";

/** 로그인 화면에서 테스트 계정으로 로그인한다 */
export async function login(page: Page, slot: "a" | "b", path = "/") {
  const { email, password } = readCreds()[slot];
  await page.goto(path);
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
