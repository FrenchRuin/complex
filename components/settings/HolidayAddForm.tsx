"use client";

import { useState, useTransition } from "react";
import { addCustomHoliday } from "@/app/(app)/settings/holiday-actions";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { DateString } from "@/lib/date";

/** 공휴일 직접 추가: 임시공휴일, 회사 휴무처럼 기본 목록에 없는 쉬는 날 (F-55) */
export function HolidayAddForm({ defaultDate }: { defaultDate: DateString }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await addCustomHoliday(date, name);
      if (result.error) return setError(result.error);
      setName("");
      toast("공휴일을 추가했어요");
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DatePicker label="날짜" value={date} onChange={setDate} />
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="예: 임시공휴일, 창립기념일" />
      </div>
      <p role="alert" className="text-caption text-danger empty:hidden">
        {error}
      </p>
      <Button type="submit" pending={pending} className="w-full">
        {pending ? "추가하는 중" : "공휴일 추가"}
      </Button>
    </form>
  );
}
