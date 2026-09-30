"use client";

import { useState, useTransition, type FormEvent } from "react";
import { resetLoanRuleGroup, saveLoanRuleGroup } from "@/app/(app)/loans/actions";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { RULE_FIELDS, RULE_GROUP_LABEL, type LoanRules, type RuleField, type RuleGroup } from "@/lib/calc/loan-rules";
import { parseRateBp } from "@/lib/calc/loans";
import { formatNumber, parseWon } from "@/lib/money";

type Props = { group: RuleGroup; value: LoanRules[RuleGroup]; isDefault: boolean };

const UNIT_SUFFIX: Record<RuleField["unit"], string> = { pct: "%", won: "원", bp: "%", years: "년", text: "" };

function toText(field: RuleField, raw: unknown): string {
  if (field.unit === "text") return String(raw);
  const n = Number(raw);
  if (field.unit === "won") return formatNumber(n);
  if (field.unit === "bp") return String(n / 100);
  return String(n);
}

function fromText(field: RuleField, text: string): number | string | null {
  if (field.unit === "text") return text.trim();
  if (field.unit === "won") return parseWon(text);
  if (field.unit === "bp") return parseRateBp(text);
  const n = Number(text.trim());
  return text.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** 기준값 묶음 하나 (F-43): 값·확인한 날·출처 저장, 조사값으로 되돌리기 */
export function RuleGroupEditor({ group, value, isDefault }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const record = value as Record<string, unknown>;
  const fields = RULE_FIELDS[group];
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, toText(f, record[f.key])])),
  );
  const [checkedOn, setCheckedOn] = useState(value.checkedOn);
  const [source, setSource] = useState(value.source);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, unknown> = { checkedOn, source: source.trim() };
    for (const f of fields) {
      const v = fromText(f, texts[f.key] ?? "");
      if (v === null || v === "") return setError(`${f.label} 칸을 확인해 주세요`);
      next[f.key] = v;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveLoanRuleGroup(group, next);
      if (result.error) return setError(result.error);
      toast(`${RULE_GROUP_LABEL[group]} 기준값을 저장했어요`);
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetLoanRuleGroup(group);
      if (result.error) return setError(result.error);
      toast(`${RULE_GROUP_LABEL[group]}을(를) 조사값으로 되돌렸어요`);
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate aria-label={`${RULE_GROUP_LABEL[group]} 기준값`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) =>
          f.unit === "text" ? (
            <label key={f.key} className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-caption font-semibold text-ink-muted">{f.label}</span>
              <textarea
                value={texts[f.key] ?? ""}
                onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
                maxLength={500}
                rows={4}
                className="resize-y rounded-sm bg-surface-sunken px-4 py-3 text-body text-ink"
              />
            </label>
          ) : (
            <TextField
              key={f.key}
              label={`${f.label} (${UNIT_SUFFIX[f.unit]})`}
              value={texts[f.key] ?? ""}
              onChange={(e) => setTexts((t) => ({ ...t, [f.key]: e.target.value }))}
              inputMode={f.unit === "won" || f.unit === "years" ? "numeric" : "decimal"}
            />
          ),
        )}
      </div>
      <DatePicker label="확인한 날" value={checkedOn} onChange={setCheckedOn} />
      <TextField label="출처" value={source} onChange={(e) => setSource(e.target.value)} maxLength={100} />
      <p role="alert" className="min-h-[18px] text-caption text-danger">
        {error}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending || isDefault} onClick={reset} className="flex-1">
          조사값으로 되돌리기
        </Button>
        <Button type="submit" pending={pending} className="flex-1">
          {pending ? "저장하는 중" : "저장"}
        </Button>
      </div>
    </form>
  );
}
