import Link from "next/link";
import type { PersonFilter } from "@/lib/calc/filters";
import type { MemberNames } from "@/lib/domain";

type Props = {
  current: PersonFilter;
  names: MemberNames;
  /** 각 필터로 가는 주소 (화면마다 다르다) */
  hrefFor: (who: PersonFilter) => string;
};

/** 사람 필터 (전체/공동/A/B). 링크라서 새로고침·뒤로가기에도 유지된다 (F-12, F-20) */
export function PersonFilterLinks({ current, names, hrefFor }: Props) {
  const options: { value: PersonFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "joint", label: "공동" },
    { value: "a", label: names.a ?? "A" },
    { value: "b", label: names.b ?? "B" },
  ];

  return (
    <nav aria-label="사람 필터" className="flex rounded-sm bg-surface-sunken p-1">
      {options.map((option) => {
        const active = current === option.value;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active ? "true" : undefined}
            scroll={false}
            className={`flex h-9 min-w-14 items-center justify-center rounded-[6px] px-3 text-body ${
              active ? "bg-surface-raised font-semibold text-ink ring-1 ring-line" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
