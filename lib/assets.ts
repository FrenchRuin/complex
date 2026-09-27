import { cache } from "react";
import { toAssetKind, type AssetKind } from "./calc/assets";
import { currentMonthKST, type DateString } from "./date";
import { toOwner, toSlot, type Owner, type Slot } from "./domain";
import { createClient } from "./supabase/server";

export type AssetItem = {
  id: string;
  name: string;
  kind: AssetKind;
  owner: Owner;
  amount: number;
  isLiability: boolean;
  memo: string | null;
  updatedAt: string;
};

export type Contribution = { id: string; amount: number; contributedOn: DateString; memberSlot: Slot; memo: string | null };

export type GoalItem = {
  id: string;
  name: string;
  targetAmount: number;
  dueDate: DateString | null;
  isDone: boolean;
  saved: number;
  contributions: Contribution[];
};

export type AssetsOverview = {
  assets: AssetItem[];
  snapshots: { month: DateString; totalAssets: number; totalLiabilities: number }[];
  goals: GoalItem[];
};

function fail(what: string, error: { message: string }): Error {
  return new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
}

/** 자산·목표 화면 데이터. 그 달 처음이면 지난달 순자산을 먼저 기록한다 (F-41) */
export const getAssetsOverview = cache(async (): Promise<AssetsOverview> => {
  const supabase = await createClient();
  await supabase.rpc("ensure_net_worth_snapshot", { p_current_month: `${currentMonthKST()}-01` });

  const [assetsRes, snapRes, goalsRes, contribRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, kind, owner, amount, is_liability, memo, updated_at")
      .is("deleted_at", null)
      .order("is_liability")
      .order("amount", { ascending: false }),
    supabase
      .from("net_worth_snapshots")
      .select("month, total_assets, total_liabilities")
      .order("month", { ascending: false })
      .limit(12),
    supabase
      .from("goals")
      .select("id, name, target_amount, due_date, is_done")
      .is("deleted_at", null)
      .order("is_done")
      .order("created_at"),
    supabase
      .from("goal_contributions")
      .select("id, goal_id, amount, contributed_on, member_slot, memo")
      .is("deleted_at", null)
      .order("contributed_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (assetsRes.error) throw fail("자산", assetsRes.error);
  if (snapRes.error) throw fail("순자산 기록", snapRes.error);
  if (goalsRes.error) throw fail("저축 목표", goalsRes.error);
  if (contribRes.error) throw fail("적립 기록", contribRes.error);

  return {
    assets: assetsRes.data.map((a) => ({
      id: a.id,
      name: a.name,
      kind: toAssetKind(a.kind),
      owner: toOwner(a.owner),
      amount: a.amount,
      isLiability: a.is_liability,
      memo: a.memo,
      updatedAt: a.updated_at,
    })),
    snapshots: snapRes.data.map((s) => ({
      month: s.month,
      totalAssets: s.total_assets,
      totalLiabilities: s.total_liabilities,
    })),
    goals: goalsRes.data.map((g) => {
      const contributions = contribRes.data
        .filter((c) => c.goal_id === g.id)
        .map((c) => ({
          id: c.id,
          amount: c.amount,
          contributedOn: c.contributed_on,
          memberSlot: toSlot(c.member_slot),
          memo: c.memo,
        }));
      return {
        id: g.id,
        name: g.name,
        targetAmount: g.target_amount,
        dueDate: g.due_date,
        isDone: g.is_done,
        saved: contributions.reduce((s, c) => s + c.amount, 0),
        contributions,
      };
    }),
  };
});
