"use client";

type Props = {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

/** 여러 개 고르기 (칩 모양 체크박스) */
export function CheckboxList({ legend, options, selected, onChange }: Props) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-caption font-semibold text-ink-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line-strong px-3 text-caption text-ink has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:font-semibold has-[:checked]:text-primary has-[:focus-visible]:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--primary)]"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
