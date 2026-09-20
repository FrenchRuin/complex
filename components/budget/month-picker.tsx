"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function formatMonthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function MonthPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  const now = new Date();

  function goTo(y: number, m: number) {
    setOpen(false);
    router.push(`/budget?month=${formatMonthParam(y, m)}`);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPickerYear(year);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="ghost" className="gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-primary hover:bg-accent" />
        }
      >
        <span className="text-[15px] font-bold text-primary tabular-nums">
          {year}년 {month}월
        </span>
        <ChevronDown className="size-3.5" strokeWidth={2.4} />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[272px] rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="이전 해"
            onClick={() => setPickerYear((y) => y - 1)}
          >
            <ChevronLeft className="size-3.5" strokeWidth={2.2} />
          </Button>
          <span className="text-sm font-bold text-foreground tabular-nums">{pickerYear}년</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="다음 해"
            onClick={() => setPickerYear((y) => y + 1)}
          >
            <ChevronRight className="size-3.5" strokeWidth={2.2} />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((label, i) => {
            const m = i + 1;
            const selected = pickerYear === year && m === month;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goTo(pickerYear, m)}
                className={cn(
                  "rounded-[9px] py-2.5 text-[13px] font-semibold transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="my-3.5 h-px bg-border" />

        <button
          type="button"
          onClick={() => goTo(now.getFullYear(), now.getMonth() + 1)}
          className="w-full rounded-[9px] border border-border bg-secondary py-2.5 text-[12.5px] font-semibold text-ink-secondary transition-colors hover:bg-accent hover:text-primary"
        >
          오늘로 이동
        </button>
      </PopoverContent>
    </Popover>
  );
}
