import { cache } from "react";
import { toAssetKind, type AssetKind } from "./calc/assets";
import { todayKST, type DateString } from "./date";
import { toOwner, type Owner } from "./domain";
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

function fail(what: string, error: { message: string }): Error {
  return new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
}

export type AssetsOverview = { assets: AssetItem[] };

/** 자산 화면 데이터 (F-40, F-41) */
export const getAssetsOverview = cache(async (): Promise<AssetsOverview> => {
  const supabase = await createClient();
  const [assetsRes, valuesRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, kind, owner, amount, value_as_of, is_liability, memo, created_at")
      .is("deleted_at", null)
      .order("is_liability")
      .order("amount", { ascending: false }),
    supabase.from("asset_values").select("id, asset_id, as_of, amount").is("deleted_at", null).order("as_of", { ascending: false }),
  ]);
  if (assetsRes.error) throw fail("자산", assetsRes.error);
  if (valuesRes.error) throw fail("금액 기록", valuesRes.error);

  return {
    assets: assetsRes.data.map((a) => ({
      id: a.id,
      name: a.name,
      kind: toAssetKind(a.kind),
      owner: toOwner(a.owner),
      amount: a.amount,
      valueAsOf: a.value_as_of ?? todayKST(new Date(a.created_at)),
      isLiability: a.is_liability,
      memo: a.memo,
      values: valuesRes.data.filter((v) => v.asset_id === a.id).map((v) => ({ id: v.id, asOf: v.as_of, amount: v.amount })),
    })),
  };
});
