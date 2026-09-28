"use client";

import { useId } from "react";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  /** 화면 읽기 프로그램용 그룹 이름 */
  legend: string;
  /** 폼으로 보낼 때의 이름 */
  name?: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 라벨을 화면에도 보여줄지 */
  showLegend?: boolean;
};

/**
 * 세그먼트 컨트롤. 실제 라디오 버튼이라 키보드(화살표)로 움직일 수 있다.
 * 트랙 surface-sunken, 선택 칸 surface-raised + ink.
 */
export function SegmentedControl<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  showLegend = false,
}: Props<T>) {
  const autoName = useId();
  const groupName = name ?? autoName;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={showLegend ? "mb-2 text-caption font-semibold text-ink-muted" : "sr-only"}>
        {legend}
      </legend>
      <div className="flex rounded-sm bg-surface-sunken p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="relative flex-1 cursor-pointer rounded-[6px] text-center text-body text-ink-muted hover:text-ink has-[:checked]:bg-surface-raised has-[:checked]:font-semibold has-[:checked]:text-ink has-[:focus-visible]:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--primary)]"
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="flex h-10 items-center justify-center px-2">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
