"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SCOPE_LABEL, SCOPES, SLOTS, type MemberNames, type Scope, type Slot } from "@/lib/domain";

type Props = {
  names: MemberNames;
  scope: Scope;
  memberSlot: Slot;
  onScopeChange: (scope: Scope) => void;
  onSlotChange: (slot: Slot) => void;
};

const SCOPE_OPTIONS = SCOPES.map((value) => ({ value, label: SCOPE_LABEL[value] }));

/** 구분(공동/개인)과 사람. 공동이면 "누가 결제", 개인이면 "누구의 지출" */
export function AssignmentFields({ names, scope, memberSlot, onScopeChange, onSlotChange }: Props) {
  const slotOptions = SLOTS.map((value) => ({
    value,
    label: names[value] ?? value.toUpperCase(),
  }));

  return (
    <div className="grid grid-cols-2 gap-3">
      <SegmentedControl
        legend="구분"
        options={SCOPE_OPTIONS}
        value={scope}
        onChange={onScopeChange}
        showLegend
      />
      <SegmentedControl
        legend={scope === "joint" ? "누가 결제" : "누구의 지출"}
        options={slotOptions}
        value={memberSlot}
        onChange={onSlotChange}
        showLegend
      />
    </div>
  );
}
