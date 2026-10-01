import { expect, test } from "@playwright/test";
import { E2E_CRON_SECRET } from "./support/accounts";

test("깨우기 주소는 비밀값 없이 부르면 거절한다", async ({ request }) => {
  const res = await request.get("/api/keep-alive", { maxRedirects: 0 });
  expect(res.status()).toBe(401);
  const wrong = await request.get("/api/keep-alive", { headers: { authorization: "Bearer wrong" }, maxRedirects: 0 });
  expect(wrong.status()).toBe(401);
});

test("깨우기 주소는 비밀값이 맞으면 DB를 한 번 읽고 성공한다", async ({ request }) => {
  const res = await request.get("/api/keep-alive", { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
