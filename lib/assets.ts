import { cache } from "react";
import { toAssetKind, type AssetKind, type HistoryAsset, type HistoryValue } from "./calc/assets";
import { todayKST, type DateString } from "./date";
import { toOwner, toSlot, type Owner, type Slot } from "./domain";
import { createClient } from "./supabase/server";

export type AssetValue = { id: string; asOf: DateString; amount: number };

export type AssetItem = {
  id: string;
  name: string;
  kind: AssetKind;
  owner: Owner;
  /** 가장 최근 금액 기록 */
  amount: number;
  /** 가장 최근 기록의 기준일 */
  valueAsOf: DateString;
  isLiability: boolean;
  memo: string | null;
  /** 금액 기록, 최근 날짜 먼저 */
  values: AssetValue[];
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
  /** 지금 있는 항목 (목록용) */
  assets: AssetItem[];
  /** 추이 계산용: 삭제한 항목까지 + 전체 금액 기록 */
  history: { assets: HistoryAsset[]; values: HistoryValue[] };
  goals: GoalItem[];
};

function fail(what: string, error: { message: string }): Error {
  return new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
}

/** 자산·목표 화면 데이터 (F-40~F-42) */
export const getAssetsOverview = cache(async (): Promise<AssetsOverview> => {
  const supabase = await createClient();

  const [assetsRes, valuesRes, goalsRes, contribRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, kind, owner, amount, value_as_of, is_liability, memo, created_at, deleted_at")
      .order("is_liability")
      .order("amount", { ascending: false }),
    supabase
      .from("asset_values")
      .select("id, asset_id, as_of, amount")
      .is("deleted_at", null)
      .order("as_of", { ascending: false }),
    supabase.from("goals").select("id, name, target_amount, due_date, is_done").is("deleted_at", null).order("is_done").order("created_at"),
    supabase
      .from("goal_contributions")
      .select("id, goal_id, amount, contributed_on, member_slot, memo")
      .is("deleted_at", null)
      .order("contributed_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (assetsRes.error) throw fail("자산", assetsRes.error);
  if (valuesRes.error) throw fail("금액 기록", valuesRes.error);
  if (goalsRes.error) throw fail("저축 목표", goalsRes.error);
  if (contribRes.error) throw fail("적립 기록", contribRes.error);

  const values = valuesRes.data.map((v) => ({ id: v.id, assetId: v.asset_id, asOf: v.as_of, amount: v.amount }));

  return {
    assets: assetsRes.data
      .filter((a) => !a.deleted_at)
      .map((a) => ({
        id: a.id,
        name: a.name,
        kind: toAssetKind(a.kind),
        owner: toOwner(a.owner),
        amount: a.amount,
        valueAsOf: a.value_as_of ?? todayKST(new Date(a.created_at)),
        isLiability: a.is_liability,
        memo: a.memo,
        values: values.filter((v) => v.assetId === a.id).map(({ id, asOf, amount }) => ({ id, asOf, amount })),
      })),
    history: {
      assets: assetsRes.data.map((a) => ({
        id: a.id,
        isLiability: a.is_liability,
        deletedOn: a.deleted_at ? todayKST(new Date(a.deleted_at)) : null,
      })),
      values: values.map(({ assetId, asOf, amount }) => ({ assetId, asOf, amount })),
    },
    goals: goalsRes.data.map((g) => {
      const contributions = contribRes.data
        .filter((c) => c.goal_id === g.id)
        .map((c) => ({ id: c.id, amount: c.amount, contributedOn: c.contributed_on, memberSlot: toSlot(c.member_slot), memo: c.memo }));
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
