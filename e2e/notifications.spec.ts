import { expect, test } from "@playwright/test";
import { adminClient, E2E_NAMES, readCreds, userClient } from "./support/accounts";
import { login } from "./support/login";

test("한 사람이 내역을 추가하면 다른 사람에게 알림이 오고, 누르면 그 내역이 열린다 (F-17)", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await login(pageA, "a");
  await login(pageB, "b");

  // B: 지금 있는 알림은 모두 읽음으로 (앞선 테스트에서 쌓인 것)
  const bellB = pageB.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await bellB.click();
  const list = pageB.getByRole("dialog");
  const markAll = list.getByRole("button", { name: "모두 읽음" });
  if (await markAll.isEnabled()) await markAll.click();
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");
  await pageB.waitForTimeout(2000); // 실시간 구독 준비

  // A가 내역 추가 (자기 자신에게는 알림이 가지 않는다)
  await pageA.getByRole("button", { name: "내역 추가" }).first().click();
  const panel = pageA.getByRole("dialog", { name: "내역 추가" });
  await panel.getByLabel("금액").fill("8000");
  await panel.getByRole("radio", { name: "식비" }).click();
  await panel.getByLabel("가맹점·내용 (선택)").fill("E2E 알림 떡볶이");
  await panel.getByRole("button", { name: "저장" }).click();
  await expect(panel).toBeHidden();

  // B: 새로고침 없이 배지가 생긴다
  await expect(bellB).toHaveAccessibleName("알림, 안 읽은 알림 1건", { timeout: 8000 });
  const bellA = pageA.getByRole("complementary").getByRole("button", { name: /^알림/ });
  await expect(bellA).not.toHaveAccessibleName(/E2E/);

  // B: 알림을 누르면 내역 화면으로 가서 편집 창이 열린다
  await bellB.click();
  await pageB
    .getByRole("link", { name: new RegExp(`${E2E_NAMES.a}님이 E2E 알림 떡볶이 8,000원을 추가했어요`) })
    .click();
  await expect(pageB).toHaveURL(/\/transactions\?month=\d{4}-\d{2}&day=\d{4}-\d{2}-\d{2}$/);
  await expect(pageB.getByRole("dialog", { name: "내역 수정" })).toBeVisible();
  await expect(pageB.getByLabel("가맹점·내용 (선택)")).toHaveValue("E2E 알림 떡볶이");
  // 편집 창을 닫으면 읽음 처리돼 배지가 사라져 있다
  await pageB.keyboard.press("Escape");
  await expect(bellB).toHaveAccessibleName("알림");
  // 주소의 tx는 지워져 새로고침해도 편집 창이 다시 열리지 않는다
  await pageB.reload();
  await expect(pageB.getByRole("dialog", { name: "내역 수정" })).toBeHidden();

  await contextA.close();
  await contextB.close();
});

test("알림 규칙: 문자 여러 건은 하나로, 같은 내역 수정은 하나로, 삭제·정기지출 체크, 내 알림은 안 옴 (F-17)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  const { data: category } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
  const categoryId = category!.id as string;
  const since = new Date().toISOString();
  const row = (merchant: string, amount: number, source: string) => ({
    type: "expense", amount, occurred_on: "2026-09-10", category_id: categoryId, merchant,
    scope: "joint", member_slot: "a", source,
    // DB가 로그인한 사람으로 덮어쓴다
    household_id: "00000000-0000-0000-0000-000000000000",
    created_by: "00000000-0000-0000-0000-000000000000",
    updated_by: "00000000-0000-0000-0000-000000000000",
  });

  // 문자 3건을 한 번에 → 알림 1개 (3건)
  const sms = await a.from("transactions").insert([row("E2E 문자1", 1000, "sms"), row("E2E 문자2", 2000, "sms"), row("E2E 문자3", 3000, "sms")]);
  expect(sms.error).toBeNull();

  // 직접 입력 1건 → 두 번 고치기 → 안 읽은 "수정" 알림은 하나만
  const { data: tx } = await a.from("transactions").insert(row("E2E 규칙", 5000, "manual")).select("id").single();
  await a.from("transactions").update({ amount: 6000 }).eq("id", tx!.id);
  await a.from("transactions").update({ amount: 7000 }).eq("id", tx!.id);
  // 바뀐 게 없는 저장은 알림 없음
  await a.from("transactions").update({ amount: 7000 }).eq("id", tx!.id);
  await a.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", tx!.id);
  // 정기지출 납부 체크로 생긴 내역 (source = recurring)
  await a.from("transactions").insert(row("E2E 월세", 700000, "recurring"));
  // 진짜 정기지출을 체크했다가 풀면 "삭제" 대신 "납부 체크를 풀었어요" (지난달에만 있는 항목: 다른 테스트의 미납 개수에 안 섞이게)
  const { data: item, error: itemError } = await a
    .from("recurring_items")
    .insert({
      name: "E2E 관리비", amount: 150000, day_of_month: 25, category_id: categoryId,
      scope: "joint", member_slot: "a", start_month: "2026-08-01", end_month: "2026-08-01",
      household_id: "00000000-0000-0000-0000-000000000000",
    })
    .select("id")
    .single();
  expect(itemError).toBeNull();
  expect((await a.rpc("check_recurring", { p_item_id: item!.id, p_month: "2026-08-01" })).error).toBeNull();
  expect((await a.rpc("uncheck_recurring", { p_item_id: item!.id, p_month: "2026-08-01" })).error).toBeNull();

  const { data: forB } = await b
    .from("notifications")
    .select("kind, subject, amount, count, transaction_id")
    .gte("created_at", since)
    .order("created_at");
  const kinds = (forB ?? []).map((n) => n.kind);
  expect(kinds.filter((k) => k === "sms_batch")).toHaveLength(1);
  expect(forB!.find((n) => n.kind === "sms_batch")).toMatchObject({ count: 3, amount: 6000 });
  const mine = (forB ?? []).filter((n) => n.transaction_id === tx!.id);
  expect(mine.map((n) => n.kind)).toEqual(["created", "updated", "deleted"]);
  expect(mine.find((n) => n.kind === "updated")).toMatchObject({ amount: 7000, subject: "E2E 규칙" });
  expect(forB!.filter((n) => n.kind === "recurring_paid").map((n) => n.subject)).toEqual(["E2E 월세", "E2E 관리비"]);
  expect(forB!.filter((n) => n.kind === "deleted")).toHaveLength(1);
  expect(forB!.filter((n) => n.kind === "recurring_unchecked")).toEqual([
    expect.objectContaining({ subject: "E2E 관리비", amount: 150000 }),
  ]);

  // A 자신에게는 알림이 없다
  const { data: forA } = await a.from("notifications").select("id").gte("created_at", since);
  expect(forA).toHaveLength(0);

  // 알림은 직접 만들 수도, 다른 칸을 바꿀 수도 없다
  const forged = await b.from("notifications").insert({ kind: "created" } as never);
  expect(forged.error).not.toBeNull();
  const tamper = await b.from("notifications").update({ subject: "바꿈" } as never).gte("created_at", since);
  expect(tamper.error).not.toBeNull();
});

test("90일 지난 알림은 새 알림이 생길 때 지워진다 (F-17)", async () => {
  const creds = readCreds();
  const a = await userClient(creds.a.email, creds.a.password);
  const admin = adminClient();
  const { data: members } = await admin.from("members").select("id, household_id, display_name").in("display_name", [E2E_NAMES.a, E2E_NAMES.b]);
  const memberA = members!.find((m) => m.display_name === E2E_NAMES.a)!;
  const memberB = members!.find((m) => m.display_name === E2E_NAMES.b)!;
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const old = (subject: string, days: number) => ({
    household_id: memberB.household_id, recipient_id: memberB.id, actor_id: memberA.id,
    kind: "created", subject, amount: 1000, created_at: daysAgo(days),
  });
  const seeded = await admin.from("notifications").insert([old("E2E 91일 전", 91), old("E2E 80일 전", 80)]);
  expect(seeded.error).toBeNull();

  const { data: category } = await a.from("categories").select("id").eq("type", "expense").eq("name", "식비").single();
  const added = await a.from("transactions").insert({
    type: "expense", amount: 1000, occurred_on: "2026-09-10", category_id: category!.id, merchant: "E2E 정리",
    scope: "joint", member_slot: "a", source: "manual",
    household_id: "00000000-0000-0000-0000-000000000000",
    created_by: "00000000-0000-0000-0000-000000000000",
    updated_by: "00000000-0000-0000-0000-000000000000",
  });
  expect(added.error).toBeNull();

  const { data: left } = await admin.from("notifications").select("subject").eq("recipient_id", memberB.id).like("subject", "E2E %일 전");
  expect(left!.map((n) => n.subject)).toEqual(["E2E 80일 전"]);
});
