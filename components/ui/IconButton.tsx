import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  /** 화면 읽기 프로그램용 이름. 아이콘 버튼에는 꼭 필요하다. */
  label: string;
  /** md 44px(기본), sm 36px(목록 행처럼 좁은 곳) */
  size?: "md" | "sm";
};

/** 아이콘 버튼 */
export function IconButton({
  icon: Icon,
  label,
  size = "md",
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex ${size === "md" ? "size-11" : "size-9"} shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
