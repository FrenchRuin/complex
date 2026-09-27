import { PersonChip } from "@/components/ui/PersonChip";
import { splitPercents, type Split } from "@/lib/calc/dashboard";
import { OWNERS, ownerLabel, type MemberNames } from "@/lib/domain";
import { formatWon } from "@/lib/money";

const SEGMENT: Record<keyof Split, string> = {
  joint: "bg-joint",
  a: "bg-member-a",
  b: "bg-member-b",
};

/** 공동/A/B 분할 막대 (F-20). 색은 항상 아래 이름·금액 글자와 함께 보여준다. */
export function SplitBar({ split, names }: { split: Split; names: MemberNames }) {
  const percents = splitPercents(split);
  const total = split.joint + split.a + split.b;

  return (
    <div>
      <div
        className={`flex h-2 gap-[2px] overflow-hidden rounded-full ${total > 0 ? "" : "bg-surface-sunken"}`}
        role="img"
        aria-label={OWNERS.map((o) => `${ownerLabel(o, names)} ${percents[o]}%`).join(", ")}
      >
        {total > 0
          ? OWNERS.map((o) =>
              split[o] > 0 ? (
                <span key={o} className={SEGMENT[o]} style={{ width: `${(split[o] / total) * 100}%` }} />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {OWNERS.map((o) => (
          <li key={o} className="flex items-center justify-between gap-2">
            <PersonChip owner={o} label={ownerLabel(o, names)} />
            <span className="text-body text-ink tabular-nums">
              {formatWon(split[o])}
              <span className="ml-2 text-caption text-ink-muted">{percents[o]}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
