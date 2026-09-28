import { describe, expect, it } from "vitest";
import { linkify, safeHref } from "./linkify";

describe("linkify", () => {
  it("주소가 없으면 글자 그대로", () => {
    expect(linkify("우유 사기")).toEqual([{ type: "text", value: "우유 사기" }]);
    expect(linkify("")).toEqual([]);
  });

  it("https 주소를 링크로, 앞뒤 글자는 그대로", () => {
    expect(linkify("여기 https://coupang.com/vp/123?q=1 봐")).toEqual([
      { type: "text", value: "여기 " },
      { type: "link", value: "https://coupang.com/vp/123?q=1", href: "https://coupang.com/vp/123?q=1" },
      { type: "text", value: " 봐" },
    ]);
  });

  it("www. 는 https를 붙여 연다", () => {
    expect(linkify("www.naver.com")).toEqual([{ type: "link", value: "www.naver.com", href: "https://www.naver.com/" }]);
  });

  it("한글이 바로 붙어도 주소까지만", () => {
    expect(linkify("https://a.com에서 샀어")[0]).toEqual({ type: "link", value: "https://a.com", href: "https://a.com/" });
  });

  it("문장 끝 부호와 짝 없는 괄호는 뺀다", () => {
    expect(linkify("(https://a.com/x).")).toEqual([
      { type: "text", value: "(" },
      { type: "link", value: "https://a.com/x", href: "https://a.com/x" },
      { type: "text", value: ")." },
    ]);
    expect(linkify("https://ko.wikipedia.org/wiki/A_(B)")[0]).toMatchObject({ value: "https://ko.wikipedia.org/wiki/A_(B)" });
  });

  it("여러 개와 줄바꿈", () => {
    const segments = linkify("A https://a.com\nB http://b.co.kr");
    expect(segments.filter((s) => s.type === "link").map((s) => s.value)).toEqual(["https://a.com", "http://b.co.kr"]);
  });
});

describe("safeHref", () => {
  it("http·https만 허용", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("https://localhost")).toBeNull();
    expect(safeHref("ftp://a.com")).toBeNull();
    expect(safeHref("https://a.com")).toBe("https://a.com/");
  });
});
