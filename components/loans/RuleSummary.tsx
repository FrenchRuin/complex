import Link from "next/link";
import { isRuleStale, RULE_GROUP_LABEL, RULE_GROUPS, ruleValueSummary, type LoanRules } from "@/lib/calc/loan-rules";
import { formatFullDate } from "@/lib/date";

type Props = { rules: LoanRules; today: string };

/** 기준값 묶음마다 값·확인한 날·출처. 6개월 넘게 지나면 확인해 달라고 표시 */
export function RuleSummary({ rules, today }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-label="기준값 묶음">
        {RULE_GROUPS.map((g) => (
          <li key={g} className="flex flex-col rounded-sm bg-surface px-4 py-3">
            <span className="text-body text-ink">{RULE_GROUP_LABEL[g]}</span>
            <span className="text-caption text-ink tabular-nums">{ruleValueSummary(g, rules)}</span>
            <span className="text-caption text-ink-muted">
              {formatFullDate(rules[g].checkedOn)} 확인 · {rules[g].source}
            </span>
            {isRuleStale(rules[g].checkedOn, today) ? (
              <span className="text-caption text-danger">오래된 기준이에요, 확인해 주세요</span>
            ) : null}
          </li>
        ))}
      </ul>
      <Link
        href="/loans/rules"
        className="inline-flex h-12 items-center justify-center rounded-md border border-line-strong bg-surface-raised px-5 text-body font-semibold text-ink hover:bg-surface-sunken"
      >
        기준값 수정
      </Link>
    </div>
  );
}
