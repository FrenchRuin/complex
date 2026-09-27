/**
 * Supabase 공개 설정값. 비어 있으면 원인과 해결 방법을 알려주는 오류를 낸다.
 * NEXT_PUBLIC_ 값은 브라우저 번들에 들어가도 되는 값만 둔다.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase 설정이 비어 있어요. .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 넣고 개발 서버를 다시 켜 주세요.",
    );
  }

  return { url, publishableKey };
}
