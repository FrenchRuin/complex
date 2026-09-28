import { linkify } from "@/lib/linkify";

/**
 * 글 속 주소(http·https·www.)를 누를 수 있는 링크로 보여준다. 새 창으로 열고 이 앱 정보를 넘기지 않는다.
 * 줄바꿈은 부르는 쪽에서 whitespace-pre-wrap으로 살린다.
 */
export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((segment, index) =>
        segment.type === "link" ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline underline-offset-2 hover:no-underline"
          >
            {segment.value}
            <span className="sr-only"> (새 창)</span>
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </>
  );
}
