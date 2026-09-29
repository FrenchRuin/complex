"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PersonChip } from "@/components/ui/PersonChip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { AssetItem } from "@/lib/assets";
import { ASSET_KIND_LABEL, groupAssets, type AssetFilter } from "@/lib/calc/assets";
import { formatDayHeader, todayKST } from "@/lib/date";
import { OWNERS, ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { AssetEditor } from "./AssetEditor";

type Props = { assets: AssetItem[]; names: MemberNames };

const SIDE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "asset", label: "자산" },
  { value: "liability", label: "부채" },
] as const;

/** 항목이 이만큼 이상이면 필터를 보여준다 (몇 개 없을 땐 목록만) */
const FILTER_FROM = 4;

/**
 * 자산·부채 목록 (F-40). 종류별로 묶어 개수·합계만 보이고, 누르면 펼쳐진다.
 * 위쪽 필터: 자산/부채, 누구 것. 행을 누르면 수정 창.
 */
export function AssetList({ assets, names }: Props) {
  // id로 들고 있어야 금액 기록을 바꾼 뒤 새 데이터로 다시 그린다
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const editing = editingId === "new" ? "new" : (assets.find((a) => a.id === editingId) ?? null);
  const [filter, setFilter] = useState<AssetFilter>({ side: "all", owner: "all" });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const currentYear = Number(todayKST().slice(0, 4));
  const groups = groupAssets(assets, filter);
  const ownerOptions = [{ value: "all", label: "전체" } as const, ...OWNERS.map((o) => ({ value: o, label: ownerLabel(o, names) }))];

  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {assets.length >= FILTER_FROM ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[3fr_4fr]">
          <SegmentedControl
            legend="자산·부채"
            options={SIDE_OPTIONS}
            value={filter.side}
            onChange={(side) => setFilter((f) => ({ ...f, side }))}
          />
          <SegmentedControl
            legend="누구 것"
            options={ownerOptions}
            value={filter.owner}
            onChange={(owner) => setFilter((f) => ({ ...f, owner }))}
          />
        </div>
      ) : null}

      {assets.length === 0 ? (
        <p className="py-4 text-center text-body text-ink-muted">
          통장, 적금, 전세 보증금, 대출 같은 항목을 추가하면 순자산을 계산해 줘요.
        </p>
      ) : groups.length === 0 ? (
        <p className="py-4 text-center text-body text-ink-muted">고른 조건에 맞는 항목이 없어요.</p>
      ) : (
        <ul className="flex flex-col">
          {groups.map((group) => {
            const expanded = open.has(group.key);
            const listId = `asset-group-${group.key}`;
            return (
              <li key={group.key} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={listId}
                  onClick={() => toggle(group.key)}
                  className="-mx-2 flex min-h-12 w-[calc(100%+16px)] items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-surface-sunken/60"
                >
                  <ChevronDown
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden
                    className={`shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${expanded ? "" : "-rotate-90"}`}
                  />
                  <span className="flex-1 text-body text-ink">
                    {group.label} <span className="text-caption text-ink-muted">{group.items.length}개</span>
                  </span>
                  <span className="text-amount text-ink tabular-nums">
                    {group.isLiability ? "−" : ""}
                    {formatWon(group.total)}
                  </span>
                </button>
                <ul id={listId} hidden={!expanded} className="pb-2 pl-7">
                  {group.items.map((a) => (
                    <li key={a.id} className="border-t border-line first:border-t-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(a.id)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-sunken/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-body text-ink">{a.name}</span>
                          <span className="block truncate text-caption text-ink-muted">
                            {ASSET_KIND_LABEL[a.kind]} · {formatDayHeader(a.valueAsOf, currentYear)} 기준
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-body text-ink tabular-nums">
                            {a.isLiability ? "−" : ""}
                            {formatWon(a.amount)}
                          </span>
                          <PersonChip owner={a.owner} label={ownerLabel(a.owner, names)} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setEditingId("new")} className="w-full">
        <Plus size={20} strokeWidth={1.75} aria-hidden />
        자산·부채 추가
      </Button>
      {editing ? (
        <AssetEditor
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          names={names}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}
