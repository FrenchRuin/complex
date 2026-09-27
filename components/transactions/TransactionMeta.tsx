"use client";

import { useState } from "react";
import { formatMonthDayKST } from "@/lib/date";
import type { HouseholdMember } from "@/lib/household";
import type { TransactionRecord } from "./types";

/** 수정으로 볼 최소 시간 차이 (추가 직후 자동 갱신은 수정으로 치지 않는다) */
const EDIT_THRESHOLD_MS = 60_000;

/** "서연님이 9월 26일에 추가 · 지훈님이 수정" (F-11) */
export function AuthorLine({ record, members }: { record: TransactionRecord; members: HouseholdMember[] }) {
  const nameOf = (memberId: string) => members.find((m) => m.id === memberId)?.displayName ?? "알 수 없는 사람";
  const edited =
    new Date(record.updatedAt).getTime() - new Date(record.createdAt).getTime() > EDIT_THRESHOLD_MS;

  return (
    <p className="text-caption text-ink-muted">
      {nameOf(record.createdBy)}님이 {formatMonthDayKST(record.createdAt)}에 추가
      {edited ? ` · ${nameOf(record.updatedBy)}님이 수정` : null}
    </p>
  );
}

type DeleteProps = { disabled: boolean; onDelete: () => void };

/** 삭제는 한 번 더 눌러야 한다 (F-11) */
export function DeleteButton({ disabled, onDelete }: DeleteProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (confirming ? onDelete() : setConfirming(true))}
      onBlur={() => setConfirming(false)}
      className={`inline-flex h-12 items-center justify-center rounded-md px-4 text-body font-semibold disabled:opacity-60 ${
        confirming ? "bg-danger text-on-primary" : "bg-danger-soft text-danger"
      }`}
    >
      {confirming ? "한 번 더 누르면 삭제돼요" : "삭제"}
    </button>
  );
}
