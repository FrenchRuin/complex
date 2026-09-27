import { describe, expect, it } from "vitest";
import { defaultAssignment, ownerOfTransaction } from "./assignment";

describe("defaultAssignment", () => {
  it("공동 소유 결제수단이면 공동 + 입력한 사람", () => {
    expect(defaultAssignment("joint", "b")).toEqual({ scope: "joint", memberSlot: "b" });
  });

  it("개인 소유 결제수단이면 소유자의 개인", () => {
    expect(defaultAssignment("a", "b")).toEqual({ scope: "personal", memberSlot: "a" });
    expect(defaultAssignment("b", "a")).toEqual({ scope: "personal", memberSlot: "b" });
  });

  it("결제수단이 없으면 입력한 사람의 개인", () => {
    expect(defaultAssignment(null, "a")).toEqual({ scope: "personal", memberSlot: "a" });
  });
});

describe("ownerOfTransaction", () => {
  it("공동이면 joint, 개인이면 그 사람", () => {
    expect(ownerOfTransaction("joint", "a")).toBe("joint");
    expect(ownerOfTransaction("personal", "b")).toBe("b");
  });
});
