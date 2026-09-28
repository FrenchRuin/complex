import type { Slot } from "@/lib/domain";

const STYLES: Record<Slot, string> = {
  a: "bg-member-a-soft text-member-a",
  b: "bg-member-b-soft text-member-b",
};

const SIZES = {
  sm: "size-8 text-label",
  lg: "size-16 text-title",
};

type Props = { slot: Slot; name: string; avatarUrl?: string | null; size?: keyof typeof SIZES };

/** 프로필 사진(있으면) 또는 이름 첫 글자 아바타. 이름은 옆에 글자로 함께 보여줘야 한다 (색만으로 구분하지 않기). */
export function Avatar({ slot, name, avatarUrl = null, size = "sm" }: Props) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        className={`inline-block shrink-0 rounded-full object-cover ${SIZES[size]}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${SIZES[size]} ${STYLES[slot]}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
