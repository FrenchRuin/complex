"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTransactionPanel } from "./TransactionPanelProvider";
import type { TransactionRecord } from "./types";

/**
 * 알림에서 왔을 때(?tx=id) 그 내역의 편집 창을 연다 (F-17).
 * 연 뒤에는 주소에서 tx를 지워, 새로고침하거나 뒤로 가도 다시 열리지 않게 한다.
 */
export function OpenFromQuery({ rows }: { rows: readonly TransactionRecord[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { openEdit } = useTransactionPanel();
  const handled = useRef<string | null>(null);
  const txId = params.get("tx");

  useEffect(() => {
    if (!txId || handled.current === txId) return;
    handled.current = txId;
    const record = rows.find((r) => r.id === txId);
    if (record) openEdit(record);

    const next = new URLSearchParams(params);
    next.delete("tx");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [txId, rows, openEdit, params, pathname, router]);

  return null;
}
