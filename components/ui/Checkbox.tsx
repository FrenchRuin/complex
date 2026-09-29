import { Check, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 옆에 보일 글자. 없으면 ariaLabel을 꼭 준다 */
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
  /** 저장 중: 체크 대신 도는 표시, 끝날 때까지 바꿀 수 없다 */
  pending?: boolean;
};

/**
 * 체크박스. 진짜 <input type="checkbox">는 그대로 두고(키보드·화면 읽기 그대로) 겉모양만 그린다:
 * 둥근 네모, 켜면 primary 바탕 + 흰 체크.
 */
export function Checkbox({ checked, onChange, children, ariaLabel, className = "", pending = false }: Props) {
  return (
    <label className={`flex items-center gap-2 text-body text-ink ${className}`}>
      <span className="relative inline-flex size-5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => (pending ? undefined : onChange(e.target.checked))}
          aria-label={ariaLabel}
          aria-busy={pending || undefined}
          aria-disabled={pending || undefined}
          className="peer absolute inset-0 m-0 cursor-pointer appearance-none aria-disabled:cursor-progress rounded-[6px] border-2 border-line-strong bg-surface-raised transition-colors duration-150 checked:border-primary checked:bg-primary hover:border-primary"
        />
        {pending ? (
          <LoaderCircle
            size={14}
            strokeWidth={3}
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto animate-spin text-primary peer-checked:text-on-primary motion-reduce:animate-none"
          />
        ) : (
          <Check
            size={14}
            strokeWidth={3}
            aria-hidden
            className="pointer-events-none absolute inset-0 m-auto text-on-primary opacity-0 peer-checked:opacity-100"
          />
        )}
      </span>
      {children}
    </label>
  );
}
