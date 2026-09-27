/**
 * 문자 → 결제수단 연결 (SPEC §8.1). 결제수단의 문자 인식용 별칭(sms_aliases)과 먼저 대조한다.
 */
type MethodWithAliases = { id: string; smsAliases: string[] };

const squash = (text: string) => text.replace(/\s/g, "").toLowerCase();

/** 별칭이 문자에 들어 있으면 그 결제수단. 여러 개면 가장 긴 별칭이 이긴다 */
export function matchPaymentMethod(message: string, methods: readonly MethodWithAliases[]): string | null {
  const text = squash(message);
  let best: { id: string; length: number } | null = null;
  for (const method of methods) {
    for (const alias of method.smsAliases) {
      const a = squash(alias);
      if (a && text.includes(a) && (!best || a.length > best.length)) best = { id: method.id, length: a.length };
    }
  }
  return best?.id ?? null;
}
