import type { Owner, Scope, Slot } from "@/lib/domain";

export type Assignment = { scope: Scope; memberSlot: Slot };

/**
 * 내역의 구분·사람 기본값 (F-10, §8.1).
 * - 결제수단 소유가 공동 → 공동 + 입력한 사람이 결제
 * - A/B 소유 → 그 사람의 개인
 * - 결제수단 없음 → 입력한 사람의 개인
 */
export function defaultAssignment(owner: Owner | null, mySlot: Slot): Assignment {
  if (owner === "joint") return { scope: "joint", memberSlot: mySlot };
  if (owner === "a" || owner === "b") return { scope: "personal", memberSlot: owner };
  return { scope: "personal", memberSlot: mySlot };
}

/** 사람 칩에 쓸 값: 공동이면 joint, 개인이면 그 사람 */
export function ownerOfTransaction(scope: Scope, memberSlot: Slot): Owner {
  return scope === "joint" ? "joint" : memberSlot;
}
