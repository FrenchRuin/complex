import { expect, test } from "@playwright/test";
import { adminClient, readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

test("휴대폰 알림 보내기 경로: 새 알림만 한 번, 옛 알림·잘못된 요청은 안 보냄 (F-57)", async ({ request }) => {
  const a = await userClient(readCreds().a.email, readCreds().a.password);
  const b = await userClient(readCreds().b.email, readCreds().b.password);
  const admin = adminClient();

  expect((await request.post("/api/push", { data: { id: "not-a-uuid" } })).status()).toBe(400);

  // A가 내역을 넣으면 B에게 새 알림이 생긴다
  const { data: food } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
  const fake = "00000000-0000-0000-0000-000000000000";
  const { data: tx } = await a
    .from("transactions")
    .insert({
      type: "expense", amount: 3000, occurred_on: "2026-09-10", category_id: food!.id, merchant: "E2E 푸시",
      scope: "joint", member_slot: "a", source: "manual", household_id: fake, created_by: fake, updated_by: fake,
    })
    .select("id")
    .single();
  const { data: fresh } = await b.from("notifications").select("id").eq("transaction_id", tx!.id).single();

  // 처음 부르면 보냄 표시 (DB 트리거가 운영 서버를 먼저 불렀다면 이미 보낸 것으로 나온다). 두 번째는 항상 건너뜀
  const first = await (await request.post("/api/push", { data: { id: fresh!.id } })).json();
  expect(["already_pushed", "not_pushable", undefined]).toContain(first.skipped);
  const { data: marked } = await admin.from("notifications").select("pushed_at").eq("id", fresh!.id).single();
  expect(marked!.pushed_at).not.toBeNull();
  expect(await (await request.post("/api/push", { data: { id: fresh!.id } })).json()).toMatchObject({ sent: 0, skipped: "not_pushable" });

  // 2분이 지난 알림은 보내지 않는다
  const { data: members } = await admin.from("members").select("id, household_id, slot").eq("household_id", (await a.from("members").select("household_id").limit(1).single()).data!.household_id);
  const recipient = members!.find((m) => m.slot === "b")!;
  const actor = members!.find((m) => m.slot === "a")!;
  const { data: old } = await admin
    .from("notifications")
    .insert({ household_id: recipient.household_id, recipient_id: recipient.id, actor_id: actor.id, kind: "created", subject: "E2E 옛 알림", amount: 1, created_at: new Date(Date.now() - 5 * 60_000).toISOString() })
    .select("id")
    .single();
  // (넣는 순간 DB 트리거가 부르지만 5분 전 알림이라 어디서도 안 보낸다)
  expect(await (await request.post("/api/push", { data: { id: old!.id } })).json()).toMatchObject({ sent: 0, skipped: "not_pushable" });
});

test("휴대폰 알림 기기: 본인 것만 보이고, 설정 화면에서 켜기 버튼 (F-57)", async ({ page }) => {
  const a = await userClient(readCreds().a.email, readCreds().a.password);
  const b = await userClient(readCreds().b.email, readCreds().b.password);
  const fake = "00000000-0000-0000-0000-000000000000";
  const endpoint = `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}`;
  const saved = await a
    .from("push_subscriptions")
    .insert({ endpoint, p256dh: "e2e-key", auth: "e2e-auth", device: "E2E 폰", member_id: fake, household_id: fake });
  expect(saved.error).toBeNull();
  expect((await a.from("push_subscriptions").select("id").eq("endpoint", endpoint)).data).toHaveLength(1);
  // 같은 가구 상대도 남의 기기는 못 본다
  expect((await b.from("push_subscriptions").select("id").eq("endpoint", endpoint)).data).toHaveLength(0);

  // 알림 서비스 워커는 로그인 없이 자바스크립트로 열린다
  const sw = await page.request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toContain("javascript");

  await login(page, "a", "/settings");
  await page.getByRole("navigation", { name: "설정 메뉴" }).getByRole("link", { name: /^휴대폰 알림/ }).click();
  await expect(page).toHaveURL(/\/settings\/push$/);
  await expect(page.getByRole("button", { name: "이 폰에서 알림 받기" })).toBeVisible();
  await expect(page.getByRole("region", { name: "알림 받는 내 기기" })).toContainText("E2E 폰");

  await a.from("push_subscriptions").delete().eq("endpoint", endpoint);
});
