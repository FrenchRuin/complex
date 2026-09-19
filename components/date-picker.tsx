"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDefault(value?: string) {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
}

export function DatePicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [date, setDate] = useState<Date | undefined>(() => parseDefault(defaultValue));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd") : ""} />
      <PopoverTrigger
        render={<Button type="button" variant="outline" className="w-full justify-start font-normal" />}
      >
        <CalendarIcon strokeWidth={1.5} className="text-muted-foreground" />
        {date ? format(date, "yyyy년 M월 d일", { locale: ko }) : "날짜 선택"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(next) => {
            setDate(next);
            setOpen(false);
          }}
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  );
}
