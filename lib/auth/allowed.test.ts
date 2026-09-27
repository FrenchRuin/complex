import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "./allowed";

const LIST = " a@gmail.com , B@Gmail.com ,";

describe("parseAllowedEmails", () => {
  it("쉼표로 나누고 공백·대소문자를 정리한다", () => {
    expect(parseAllowedEmails(LIST)).toEqual(["a@gmail.com", "b@gmail.com"]);
  });

  it("비어 있으면 빈 목록", () => {
    expect(parseAllowedEmails(undefined)).toEqual([]);
    expect(parseAllowedEmails("")).toEqual([]);
  });
});

describe("isAllowedEmail", () => {
  it("목록에 있으면 허용한다 (대소문자 무시)", () => {
    expect(isAllowedEmail("A@GMAIL.COM", LIST)).toBe(true);
    expect(isAllowedEmail("b@gmail.com ", LIST)).toBe(true);
  });

  it("목록에 없으면 거부한다", () => {
    expect(isAllowedEmail("c@gmail.com", LIST)).toBe(false);
  });

  it("이메일이 없거나 목록이 비면 거부한다", () => {
    expect(isAllowedEmail(null, LIST)).toBe(false);
    expect(isAllowedEmail("a@gmail.com", undefined)).toBe(false);
    expect(isAllowedEmail("a@gmail.com", "")).toBe(false);
  });
});
