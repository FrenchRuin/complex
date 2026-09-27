import type { Owner } from "@/lib/domain";

const STYLES: Record<Owner, string> = {
  joint: "bg-joint-soft text-joint",
  a: "bg-member-a-soft text-member-a",
  b: "bg-member-b-soft text-member-b",
};

type Props = { owner: Owner; label: string };

/** 사람 칩. 색은 항상 이름 글자와 함께 쓴다. */
export function PersonChip({ owner, label }: Props) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2 text-label whitespace-nowrap ${STYLES[owner]}`}
    >
      {label}
    </span>
  );
}
