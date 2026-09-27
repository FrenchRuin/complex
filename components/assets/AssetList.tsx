"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PersonChip } from "@/components/ui/PersonChip";
import type { AssetItem } from "@/lib/assets";
import { ASSET_KIND_LABEL } from "@/lib/calc/assets";
import { formatMonthDayKST } from "@/lib/date";
import { ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";
import { AssetEditor } from "./AssetEditor";

type Props = { assets: AssetItem[]; names: MemberNames };

/** 자산·부채 목록 (F-40). 행을 누르면 수정 창 */
export function AssetList({ assets, names }: Props) {
  const [editing, setEditing] = useState<AssetItem | "new" | null>(null);
  const groups = [
    { title: "자산", items: assets.filter((a) => !a.isLiability) },
    { title: "부채", items: assets.filter((a) => a.isLiability) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {assets.length === 0 ? (
        <p className="py-4 text-center text-body text-ink-muted">
          통장, 적금, 전세 보증금, 대출 같은 항목을 추가하면 순자산을 계산해 줘요.
        </p>
      ) : (
        groups.map((group) =>
          group.items.length ? (
            <div key={group.title}>
              <h3 className="mb-1 flex justify-between text-label text-ink-muted tabular-nums">
                <span>{group.title}</span>
                <span>{formatWon(group.items.reduce((s, a) => s + a.amount, 0))}</span>
              </h3>
              <ul>
                {group.items.map((a) => (
                  <li key={a.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-sunken/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-ink">{a.name}</span>
                        <span className="block truncate text-caption text-ink-muted">
                          {ASSET_KIND_LABEL[a.kind]} · {formatMonthDayKST(a.updatedAt)} 기준
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-amount text-ink tabular-nums">
                          {a.isLiability ? "−" : ""}
                          {formatWon(a.amount)}
                        </span>
                        <PersonChip owner={a.owner} label={ownerLabel(a.owner, names)} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )
      )}
      <Button variant="secondary" onClick={() => setEditing("new")} className="w-full">
        <Plus size={20} strokeWidth={1.75} aria-hidden />
        자산·부채 추가
      </Button>
      {editing ? (
        <AssetEditor
          key={editing === "new" ? "new" : editing.id}
          item={editing === "new" ? null : editing}
          names={names}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
