import { ExternalLink } from "lucide-react";
import { relativeDayLabel } from "@/lib/calc/dashboard";
import { FREE_DB_LIMIT_BYTES, formatBytes, pauseNotice, usagePercent } from "@/lib/calc/usage";
import { todayKST } from "@/lib/date";
import { SettingsSection } from "./SettingsSection";

export type Usage = {
  dbSizeBytes: number;
  transactionCount: number;
  recurringCount: number;
  lastActivity: string | null;
};

type Props = { usage: Usage; supabaseProjectRef: string | null };

/** 서비스 사용량 (F-54): Supabase DB 용량, 우리 데이터 개수, 일시 정지 안내, 사용량 페이지 링크 */
export function UsageSection({ usage, supabaseProjectRef }: Props) {
  const percent = usagePercent(usage.dbSizeBytes, FREE_DB_LIMIT_BYTES);
  const now = new Date();

  return (
    <SettingsSection title="서비스 사용량" description="무료 요금제 안에서 쓰고 있는지 확인해요.">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-body text-ink">데이터베이스 용량</span>
        <span className="text-body text-ink tabular-nums">
          {formatBytes(usage.dbSizeBytes)} / {formatBytes(FREE_DB_LIMIT_BYTES)}
          <span className="ml-2 text-caption text-ink-muted">{percent}%</span>
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-label="데이터베이스 용량"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {percent >= 80 ? (
        <p className="mt-2 text-caption text-ink">무료 한도에 가까워요. 오래된 데이터를 정리하거나 요금제를 확인해 주세요.</p>
      ) : null}

      <dl className="mt-4 flex flex-col gap-2 text-body tabular-nums">
        <div className="flex justify-between">
          <dt className="text-ink-muted">내역</dt>
          <dd className="text-ink">{usage.transactionCount.toLocaleString("ko-KR")}건</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">정기지출</dt>
          <dd className="text-ink">{usage.recurringCount.toLocaleString("ko-KR")}개</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">마지막 입력</dt>
          <dd className="text-ink">
            {usage.lastActivity ? relativeDayLabel(todayKST(new Date(usage.lastActivity)), todayKST(now)) : "없음"}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-sm bg-primary-soft px-3 py-2 text-caption text-ink">
        {pauseNotice(usage.lastActivity, now)}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {supabaseProjectRef ? (
          <ExternalButton href={`https://supabase.com/dashboard/project/${supabaseProjectRef}`}>
            Supabase 사용량 보기
          </ExternalButton>
        ) : null}
        <ExternalButton href="https://vercel.com/d?to=%2F%5Bteam%5D%2F~%2Fusage&title=Usage">
          Vercel 사용량 보기
        </ExternalButton>
      </div>
      <p className="mt-2 text-caption text-ink-muted">
        Vercel 사용량(트래픽·함수 실행 시간)은 보안상 앱 안에서 가져오지 않고, Vercel 화면에서 확인해요.
      </p>
    </SettingsSection>
  );
}

function ExternalButton({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line-strong px-4 text-body font-semibold text-ink"
    >
      {children}
      <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
      <span className="sr-only">(새 창)</span>
    </a>
  );
}
