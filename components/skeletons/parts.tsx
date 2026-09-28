import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

type PageProps = {
  /** 제목을 미리 알면 글자로, 월 전환처럼 데이터가 필요하면 null → 회색 상자 */
  title: string | null;
  /** 제목 옆 필터 자리를 보여줄지 */
  withFilter?: boolean;
  /** 내용 영역 클래스 (각 화면의 실제 틀과 같게) */
  className: string;
  children: ReactNode;
};

/** 화면 뼈대 틀: 헤더 + 내용. 화면 읽기 프로그램에는 "불러오는 중"으로 읽힌다. */
export function PageSkeleton({ title, withFilter = false, className, children }: PageProps) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <PageHeader title={title ?? <Skeleton className="h-7 w-36" />}>
        {withFilter ? <Skeleton className="h-9 w-44 rounded-full" /> : null}
      </PageHeader>
      <div className={className}>{children}</div>
    </div>
  );
}

type CardProps = {
  /** 카드 안 줄 수 */
  lines?: number;
  /** 큰 숫자(amount-hero) 자리 */
  hero?: boolean;
  /** 차트·표처럼 큰 상자 */
  block?: boolean;
  /** 내역·목록처럼 아이콘 + 두 줄 + 금액 행 */
  rows?: number;
};

/** 카드 한 장 뼈대 (SettingsSection·요약 카드 모양) */
export function CardSkeleton({ lines = 0, hero = false, block = false, rows = 0 }: CardProps) {
  return (
    <div className="rounded-md bg-surface-raised p-5">
      <Skeleton className="h-5 w-28" />
      {hero ? <Skeleton className="mt-3 h-9 w-44" /> : null}
      {block ? <Skeleton className="mt-4 h-48 w-full rounded-md" /> : null}
      {lines > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: lines }, (_, i) => (
            <Skeleton key={i} className={`h-4 ${i % 2 === 0 ? "w-full" : "w-2/3"}`} />
          ))}
        </div>
      ) : null}
      {rows > 0 ? (
        <div className="mt-2">
          <RowsSkeleton count={rows} />
        </div>
      ) : null}
    </div>
  );
}

/** 목록 행 뼈대: 원형 아이콘 + 두 줄 글자 + 오른쪽 금액 */
export function RowsSkeleton({ count }: { count: number }) {
  return (
    <ul className="divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </span>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}
