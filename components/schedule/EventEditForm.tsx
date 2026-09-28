"use client";

import { useState, useTransition } from "react";
import { saveEvent } from "@/app/(app)/schedule/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { TIME_OPTIONS, type CalendarEvent, type EventRepeat } from "@/lib/calc/events";
import { addDays, type DateString } from "@/lib/date";
import { OWNERS, ownerLabel, type MemberNames, type Owner } from "@/lib/domain";

type Props = {
  /** null이면 새 일정 */
  event: CalendarEvent | null;
  /** 새 일정의 날짜 (고른 날) */
  defaultDate: DateString;
  names: MemberNames;
  onSaved: () => void;
  onCancel?: () => void;
};

const REPEAT_OPTIONS = [
  { value: "none", label: "반복 안 함" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매달" },
  { value: "yearly", label: "매년" },
] as const;
const TIMES = TIME_OPTIONS.map((t) => ({ value: t, label: t }));

/** 일정 편집 (F-19). 시각은 30분 단위 드롭다운, 여러 날·반복 끝은 켤 때만 보인다 */
export function EventEditForm({ event, defaultDate, names, onSaved, onCancel }: Props) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(event?.title ?? "");
  const [owner, setOwner] = useState<Owner>(event?.owner ?? "joint");
  const [startDate, setStartDate] = useState(event?.startDate ?? defaultDate);
  const [multiDay, setMultiDay] = useState(event ? event.endDate !== event.startDate : false);
  const [endDate, setEndDate] = useState(event?.endDate ?? defaultDate);
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startTime, setStartTime] = useState(event?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(event?.endTime ?? "");
  const [repeat, setRepeat] = useState<EventRepeat>(event?.repeat ?? "none");
  const [hasUntil, setHasUntil] = useState(Boolean(event?.repeatUntil));
  const [repeatUntil, setRepeatUntil] = useState(event?.repeatUntil ?? addDays(defaultDate, 90));
  const [memo, setMemo] = useState(event?.memo ?? "");
  const [error, setError] = useState<string | null>(null);

  function changeStart(date: DateString) {
    setStartDate(date);
    if (!multiDay || endDate < date) setEndDate(date);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveEvent({
        id: event?.id,
        title,
        memo,
        owner,
        startDate,
        endDate: multiDay ? endDate : startDate,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay || !endTime ? null : endTime,
        repeat,
        repeatUntil: repeat !== "none" && hasUntil ? repeatUntil : null,
      });
      if (result.error) return setError(result.error);
      toast(event ? "일정을 고쳤어요" : "일정을 추가했어요");
      onSaved();
    });
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <TextField label="일정 이름" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} placeholder="예: 친구 결혼식" autoFocus={!event} />
        <SegmentedControl
          legend="누구 일정"
          showLegend
          options={OWNERS.map((o) => ({ value: o, label: ownerLabel(o, names) }))}
          value={owner}
          onChange={setOwner}
        />
        <DatePicker label={multiDay ? "시작하는 날" : "날짜"} value={startDate} onChange={changeStart} />
        <Checkbox checked={multiDay} onChange={setMultiDay}>
          여러 날 일정
        </Checkbox>
        {multiDay ? <DatePicker label="끝나는 날" value={endDate} onChange={setEndDate} /> : null}

        <Checkbox checked={allDay} onChange={setAllDay}>
          하루 종일
        </Checkbox>
        {allDay ? null : (
          <div className="grid grid-cols-2 gap-2">
            <Select label="시작 시각" value={startTime} onChange={setStartTime} options={TIMES} />
            <Select label="끝 시각 (선택)" value={endTime} onChange={setEndTime} options={TIMES} emptyLabel="정하지 않음" />
          </div>
        )}

        <Select label="반복" value={repeat} onChange={(v) => setRepeat(v as EventRepeat)} options={REPEAT_OPTIONS} />
        {repeat !== "none" ? (
          <>
            <Checkbox checked={hasUntil} onChange={setHasUntil}>
              반복 끝나는 날 정하기
            </Checkbox>
            {hasUntil ? <DatePicker label="반복 끝나는 날" value={repeatUntil} onChange={setRepeatUntil} /> : null}
          </>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-ink-muted">메모 (선택)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="장소, 준비물, 주소 링크 등"
            className="resize-y rounded-sm bg-surface-sunken px-4 py-3 text-body text-ink placeholder:text-ink-muted"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <p role="alert" className="text-caption text-danger empty:hidden">
          {error}
        </p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button variant="secondary" onClick={onCancel} disabled={pending} className="flex-1">
              취소
            </Button>
          ) : null}
          <Button pending={pending} onClick={save} className="flex-1">
            {pending ? "저장하는 중" : "저장"}
          </Button>
        </div>
      </div>
    </>
  );
}
