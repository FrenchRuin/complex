import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: LucideIcon;
  /** 화면 읽기 프로그램용 이름. 아이콘 버튼에는 꼭 필요하다. */
  label: string;
};

/** 44px 터치 영역의 아이콘 버튼 */
export function IconButton({ icon: Icon, label, className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      {...props}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
