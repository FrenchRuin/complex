/**
 * E2E용 테스트 계정 두 개(같은 가구)를 만들고 지운다.
 * 서비스 키(SUPABASE_SERVICE_ROLE_KEY)를 쓰므로 내 컴퓨터에서만 실행한다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const E2E_EMAILS = { a: "e2e-a@example.com", b: "e2e-b@example.com" } as const;
export const E2E_NAMES = { a: "테스트지훈", b: "테스트서연" } as const;
const CREDS_FILE = "e2e/.auth/creds.json";

export type Creds = Record<"a" | "b", { email: string; password: string }>;

function loadEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !service) throw new Error(".env.local에 Supabase 키 3개가 있어야 E2E를 돌릴 수 있어요");
  return { url, key, service };
}

function adminClient(): SupabaseClient {
  const { url, service } = loadEnv();
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const { url, key } = loadEnv();
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`E2E 로그인 실패 ${email}: ${error.message}`);
  return client;
}

/** 남아 있는 E2E 계정과 그 가구 데이터를 지운다 */
export async function deleteE2EAccounts() {
  const admin = adminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = (data?.users ?? []).filter((u) => Object.values(E2E_EMAILS).includes(u.email as never));
  if (users.length === 0) return;

  const ids = users.map((u) => u.id);
  const { data: members } = await admin.from("members").select("household_id").in("user_id", ids);
  const households = [...new Set((members ?? []).map((m) => m.household_id))];
  if (households.length) {
    await admin.from("transactions").delete().in("household_id", households);
    await admin.from("recurring_items").delete().in("household_id", households);
    await admin.from("households").delete().in("id", households);
  }
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}

/** 새 계정 두 개 → A가 가구를 만들고 B가 초대로 합류 */
export async function createE2EAccounts(): Promise<Creds> {
  await deleteE2EAccounts();
  const admin = adminClient();
  const creds = {} as Creds;
  for (const slot of ["a", "b"] as const) {
    const password = randomBytes(12).toString("base64url");
    const { error } = await admin.auth.admin.createUser({
      email: E2E_EMAILS[slot],
      password,
      email_confirm: true,
    });
    if (error) throw error;
    creds[slot] = { email: E2E_EMAILS[slot], password };
  }

  const a = await userClient(creds.a.email, creds.a.password);
  const b = await userClient(creds.b.email, creds.b.password);
  await a.rpc("create_household", { p_display_name: E2E_NAMES.a });
  const { data: token, error } = await a.rpc("create_invite");
  if (error) throw error;
  await b.rpc("accept_invite", { p_token: token, p_display_name: E2E_NAMES.b });

  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(CREDS_FILE, JSON.stringify(creds));
  return creds;
}

export function readCreds(): Creds {
  return JSON.parse(readFileSync(CREDS_FILE, "utf8")) as Creds;
}

/** 서버에 넘길 허용 이메일: 원래 두 분 이메일 + E2E 계정 */
export function allowedEmailsForE2E(): string {
  loadEnv();
  return [process.env.ALLOWED_EMAILS ?? "", ...Object.values(E2E_EMAILS)].filter(Boolean).join(",");
}
