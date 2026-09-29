import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { Skeleton } from "@/components/ui/Skeleton";
import { CardSkeleton, PageSkeleton, RowsSkeleton } from "./parts";

/** 화면별 뼈대. 각 화면(page.tsx)의 실제 틀과 같은 여백·배치로 그린다. */

export function HomeSkeleton() {
  return (
    <PageSkeleton title="홈" withFilter className="flex flex-col gap-4 px-5 py-6 lg:px-8">
      <Skeleton className="h-4 w-2/3" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <CardSkeleton hero lines={3} />
          <CardSkeleton lines={4} />
        </div>
        <div className="flex flex-col gap-4">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={5} />
        </div>
      </div>
    </PageSkeleton>
  );
}

export function TransactionsSkeleton() {
  return (
    <PageSkeleton title={null} withFilter className="flex flex-col gap-4 px-5 py-4 lg:px-8">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="rounded-md bg-surface-raised px-5 py-2">
        <RowsSkeleton count={8} />
      </div>
    </PageSkeleton>
  );
}

export function RecurringSkeleton() {
  return (
    <PageSkeleton title="정기지출" className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
      <CardSkeleton rows={4} />
      <CardSkeleton rows={4} />
    </PageSkeleton>
  );
}

export function StatsSkeleton() {
  return (
    <PageSkeleton title={null} className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
      <div className="flex flex-col gap-4">
        <CardSkeleton block />
        <CardSkeleton lines={3} />
      </div>
      <CardSkeleton lines={8} />
    </PageSkeleton>
  );
}

export function AssetsSkeleton() {
  return (
    <PageSkeleton title="자산·목표" className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
      <div className="flex flex-col gap-4">
        <CardSkeleton hero lines={1} />
        <CardSkeleton rows={4} />
      </div>
      <div className="flex flex-col gap-4">
        <CardSkeleton block />
        <CardSkeleton lines={4} />
      </div>
    </PageSkeleton>
  );
}

export function NotesSkeleton() {
  return (
    <PageSkeleton title="메모" className="flex flex-col gap-4 px-5 py-6 lg:px-8">
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-sm" />
        <Skeleton className="h-11 w-28 rounded-md" />
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={2} />
      </div>
    </PageSkeleton>
  );
}

export function SettingsSkeleton() {
  return (
    <PageSkeleton title="설정" className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">
      <ul className="rounded-md bg-surface-raised">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i} className="flex min-h-14 items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="ml-auto h-3 w-16" />
          </li>
        ))}
      </ul>
      <Skeleton className="h-12 w-full rounded-md" />
    </PageSkeleton>
  );
}

/** 설정 하위 화면 공통: 제목은 화면마다 넘겨 받는다 */
export function SettingsSubpageSkeleton({ title }: { title: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <SettingsSubpage title={title}>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
      </SettingsSubpage>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <PageSkeleton title={null} className="grid grid-cols-1 items-start gap-4 px-5 py-4 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-6">
      <CardSkeleton block />
      <div className="flex flex-col gap-4">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
      </div>
    </PageSkeleton>
  );
}

export function BudgetSkeleton() {
  return (
    <PageSkeleton title="예산" className="grid grid-cols-1 gap-4 px-5 py-6 lg:grid-cols-2 lg:items-start lg:px-8">
      <div className="flex flex-col gap-4">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={3} />
      </div>
      <div className="flex flex-col gap-4">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={2} />
      </div>
    </PageSkeleton>
  );
}
