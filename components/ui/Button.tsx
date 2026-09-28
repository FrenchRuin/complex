import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const base =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-body font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary/90 disabled:hover:bg-primary",
  secondary:
    "border border-line-strong bg-surface-raised text-ink hover:bg-surface-sunken disabled:hover:bg-surface-raised",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** 처리 중: 글자 앞에 도는 표시를 붙이고 누를 수 없게 한다. 글자는 "저장하는 중"처럼 부르는 쪽에서 바꾼다. */
  pending?: boolean;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  pending = false,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {pending ? (
        <LoaderCircle size={18} strokeWidth={1.75} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
