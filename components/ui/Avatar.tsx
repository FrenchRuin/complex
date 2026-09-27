import type { Slot } from "@/lib/domain";

const STYLES: Record<Slot, string> = {
  a: "bg-member-a-soft text-member-a",
  b: "bg-member-b-soft text-member-b",
};

type Props = { slot: Slot; name: string };

/** 이름 첫 글자 아바타. 이름은 옆에 글자로 함께 보여줘야 한다 (색만으로 구분하지 않기). */
export function Avatar({ slot, name }: Props) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-label ${STYLES[slot]}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
