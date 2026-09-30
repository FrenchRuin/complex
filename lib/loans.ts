import { cache } from "react";
import { getAssetsOverview } from "./assets";
import { netWorth } from "./calc/assets";
import { parseRules, type LoanRules } from "./calc/loan-rules";
import {
  toDeal,
  toDebtKind,
  toHomeStatus,
  toRegion,
  type LoanDebt,
  type LoanProfile,
  type LoanScenarioInput,
} from "./calc/loans";
import { toOwner, type Owner } from "./domain";
import { createClient } from "./supabase/server";

export type LoanProfileData = LoanProfile & { updatedAt: string | null };
export type DebtItem = LoanDebt & { id: string; name: string; owner: Owner; assetId: string | null };
export type ScenarioItem = LoanScenarioInput & { id: string; name: string; memo: string };

export type LoansOverview = {
  profile: LoanProfileData;
  debts: DebtItem[];
  scenarios: ScenarioItem[];
  rules: LoanRules;
  /** 자산 메뉴 부채 중 아직 안 불러온 개수 (잔액 0원 제외) */
  importableCount: number;
};

function fail(what: string, error: { message: string }): Error {
  return new Error(`${what}을(를) 불러오지 못했어요: ${error.message}`);
}

/** 대출 화면 데이터 (F-43). 순자산은 자산 메뉴 값을 그대로 쓴다 */
export const getLoansOverview = cache(async (): Promise<LoansOverview> => {
  const supabase = await createClient();
  const [profileRes, debtsRes, scenariosRes, assets] = await Promise.all([
    supabase.from("loan_profiles").select("income_a, income_b, home_status, first_time, rules, updated_at").maybeSingle(),
    supabase
      .from("loan_debts")
      .select("id, name, kind, owner, balance, rate_bp, months_left, monthly_payment, asset_id")
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("loan_scenarios")
      .select("id, name, deal, price, region, rate_bp, term_years, extra_costs, memo")
      .is("deleted_at", null)
      .order("created_at"),
    getAssetsOverview(),
  ]);
  if (profileRes.error) throw fail("우리 정보", profileRes.error);
  if (debtsRes.error) throw fail("기존 대출", debtsRes.error);
  if (scenariosRes.error) throw fail("집 후보", scenariosRes.error);

  const p = profileRes.data;
  const debts: DebtItem[] = debtsRes.data.map((d) => ({
    id: d.id,
    name: d.name,
    kind: toDebtKind(d.kind),
    owner: toOwner(d.owner),
    balance: d.balance,
    rateBp: d.rate_bp,
    monthsLeft: d.months_left,
    monthlyPayment: d.monthly_payment,
    assetId: d.asset_id,
  }));
  const imported = new Set(debts.map((d) => d.assetId));

  return {
    profile: {
      incomeA: p?.income_a ?? 0,
      incomeB: p?.income_b ?? 0,
      homeStatus: toHomeStatus(p?.home_status ?? "none"),
      firstTime: p?.first_time ?? false,
      netWorth: netWorth(assets.assets).net,
      updatedAt: p?.updated_at ?? null,
    },
    debts,
    scenarios: scenariosRes.data.map((s) => ({
      id: s.id,
      name: s.name,
      deal: toDeal(s.deal),
      price: s.price,
      region: toRegion(s.region),
      rateBp: s.rate_bp,
      termYears: s.term_years,
      extraCosts: s.extra_costs,
      memo: s.memo,
    })),
    rules: parseRules(p?.rules),
    importableCount: assets.assets.filter((a) => a.isLiability && a.amount > 0 && !imported.has(a.id)).length,
  };
});
