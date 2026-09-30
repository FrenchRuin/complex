import type { Metadata } from "next";
import { RuleGroupEditor } from "@/components/loans/RuleGroupEditor";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { DEFAULT_RULES, RULE_GROUP_LABEL, RULE_GROUPS } from "@/lib/calc/loan-rules";
import { requireMember } from "@/lib/household";
import { getLoansOverview } from "@/lib/loans";

export const metadata: Metadata = { title: "기준값 · 대출 · 감자밭" };

/** 대출 기준값 수정 (F-43): 묶음마다 값·확인한 날·출처, 조사값으로 되돌리기 */
export default async function LoanRulesPage() {
  await requireMember();
  const { rules } = await getLoansOverview();

  return (
    <SettingsSubpage title="기준값" back={{ href: "/loans", label: "대출로 돌아가기" }}>
      <p className="text-caption text-ink-muted">
        정책이 바뀌면 여기서 고쳐 주세요. 두 사람이 같은 값을 써요. 고친 날과 출처도 함께 적어 두면 나중에 확인하기 쉬워요.
      </p>
      {RULE_GROUPS.map((g) => (
        <SettingsSection key={g} title={RULE_GROUP_LABEL[g]}>
          <RuleGroupEditor
            key={JSON.stringify(rules[g])}
            group={g}
            value={rules[g]}
            isDefault={JSON.stringify(rules[g]) === JSON.stringify(DEFAULT_RULES[g])}
          />
        </SettingsSection>
      ))}
    </SettingsSubpage>
  );
}
