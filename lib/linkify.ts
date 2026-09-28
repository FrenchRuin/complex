/**
 * 글 속 주소를 링크로 나눈다 (F-18 메모).
 * http://, https://, www. 로 시작하는 것만 링크로 본다. javascript: 같은 다른 주소는 절대 링크로 만들지 않는다.
 * 주소 글자는 URL에 쓰는 영문·숫자·기호만 이어 보므로 "https://a.com에서"는 "https://a.com"까지만 링크가 된다.
 */

export type TextSegment = { type: "text"; value: string } | { type: "link"; value: string; href: string };

const URL_PATTERN = /(?:https?:\/\/|www\.)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/gi;

/** 문장 끝 문장부호와 짝이 안 맞는 닫는 괄호는 주소에서 뺀다 */
function trimTrailing(url: string): string {
  let end = url.length;
  while (end > 0) {
    const ch = url[end - 1];
    if (".,;:!?'\"".includes(ch)) {
      end -= 1;
      continue;
    }
    if (ch === ")" || ch === "]") {
      const open = ch === ")" ? "(" : "[";
      const part = url.slice(0, end);
      if (part.split(open).length - 1 < part.split(ch).length - 1) {
        end -= 1;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

/** 링크로 열어도 되는 주소면 href, 아니면 null */
export function safeHref(raw: string): string | null {
  const candidate = /^www\./i.test(raw) ? `https://${raw}` : raw;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index;
    const value = trimTrailing(match[0]);
    const href = safeHref(value);
    if (!href || value.length === 0) continue;
    if (start > last) segments.push({ type: "text", value: text.slice(last, start) });
    segments.push({ type: "link", value, href });
    last = start + value.length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}
