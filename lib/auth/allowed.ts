/**
 * 허용 이메일 확인. 가입은 Supabase에서 막혀 있고, 이 확인은 이중 안전장치다.
 * 목록이 비어 있으면 아무도 허용하지 않는다.
 */

const normalize = (email: string) => email.trim().toLowerCase();

/** "a@x.com, B@x.com" → ["a@x.com", "b@x.com"] */
export function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(normalize)
    .filter((email) => email !== "");
}

export function isAllowedEmail(
  email: string | null | undefined,
  rawList: string | undefined = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email) return false;
  return parseAllowedEmails(rawList).includes(normalize(email));
}
