import Link from "next/link";
import { MonthSummary } from "@/components/dashboard/MonthSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { TodayMoods } from "@/components/mood/TodayMoods";
import { PersonFilterLinks } from "@/components/transactions/PersonFilterLinks";
import { TransactionList } from "@/components/transactions/TransactionList";
import { compareWithLastMonth, matchesPerson, splitByOwner } from "@/lib/calc/dashboard";
import { parseFilters, type PersonFilter } from "@/lib/calc/filters";
import { groupByDay, sumTotals } from "@/lib/calc/group";
import { formatPeriodRange, isCalendarRange, samePeriodLastPeriod } from "@/lib/calc/period";
import { todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getTodayMoods } from "@/lib/moods";
import { getCurrentPeriod, getPeriodConfig } from "@/lib/period";
import { getLabelMaps, getRecentTransactions, getTransactionsInRange } from "@/lib/transactions";

const hrefFor = (who: PersonFilter) => (who === "all" ? "/" : `/?who=${who}`);

/**
 * 홈 대시보드 (F-20): 이번 달 수입·지출, 지난달 비교, 오늘 기분, 최근 내역 (2026-10-25 단순화).
 * 사람 필터를 바꾸면 모든 숫자가 그 기준으로 바뀐다.
 */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  // "이번 달"은 한 달 기준(F-56)으로 오늘이 속한 기간. 1일 기준이면 달력의 한 달
  const [{ month, range }, periodConfig] = await Promise.all([getCurrentPeriod(), getPeriodConfig()]);
  const today = todayKST();
  const { who } = parseFilters(await searchParams, month);
  const members = await getHouseholdMembers();
  const partner = members.find((m) => m.id !== me.id) ?? null;

  const [thisMonthRows, lastPeriodRows, recent, labels, moods] = await Promise.all([
    getTransactionsInRange(range),
    getTransactionsInRange(samePeriodLastPeriod(today, periodConfig)),
    getRecentTransactions(who, 8),
    getLabelMaps(),
    getTodayMoods(),
  ]);

  const names = toMemberNames(members);
  const totals = sumTotals(thisMonthRows.filter((r) => matchesPerson(r, who)));
  const lastExpense = sumTotals(lastPeriodRows.filter((r) => matchesPerson(r, who))).expense;

  return (
    <>
      <PageHeader title="홈">
        <PersonFilterLinks current={who} names={names} hrefFor={hrefFor} />
      </PageHeader>

      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <TodayMoods meId={me.id} members={members} moods={moods} />
        {partner ? null : (
          <p className="rounded-md bg-primary-soft px-4 py-3 text-body text-ink">
            아직 혼자예요.{" "}
            <Link href="/settings/household" className="font-semibold text-primary underline-offset-4 hover:underline">
              설정에서 배우자를 초대해 주세요
            </Link>
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <MonthSummary
            monthLabel={`${Number(month.slice(5, 7))}월`}
            rangeLabel={isCalendarRange(range) ? null : formatPeriodRange(range)}
            totals={totals}
            compareText={compareWithLastMonth(totals.expense, lastExpense)}
            split={who === "all" ? splitByOwner(thisMonthRows) : null}
            names={names}
          />

          <section aria-labelledby="home-recent">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="home-recent" className="text-heading text-ink">최근 내역</h2>
              <Link
                href={who === "all" ? "/transactions" : `/transactions?who=${who}`}
                className="text-body font-semibold text-primary underline-offset-4 hover:underline"
              >
                전체 보기
              </Link>
            </div>
            <TransactionList
              groups={groupByDay(recent)}
              labels={labels}
              names={names}
              emptyMessage="아직 내역이 없어요. 내역 추가 버튼으로 시작해 보세요."
            />
          </section>
        </div>
      </div>
    </>
  );
}
