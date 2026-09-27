import Link from "next/link";
import { ActivityLine } from "@/components/dashboard/ActivityLine";
import { MonthSummary } from "@/components/dashboard/MonthSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { RecurringChecklist } from "@/components/recurring/RecurringChecklist";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { PersonFilterLinks } from "@/components/transactions/PersonFilterLinks";
import { TransactionList } from "@/components/transactions/TransactionList";
import { compareWithLastMonth, matchesPerson, splitByOwner } from "@/lib/calc/dashboard";
import { parseFilters, type PersonFilter } from "@/lib/calc/filters";
import { groupByDay, sumTotals } from "@/lib/calc/group";
import { currentMonthKST, monthRange, samePeriodLastMonth, todayKST } from "@/lib/date";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { getRecurringOverview } from "@/lib/recurring";
import {
  getLabelMaps,
  getLatestActivityBy,
  getRecentTransactions,
  getTransactionsInRange,
} from "@/lib/transactions";

const hrefFor = (who: PersonFilter) => (who === "all" ? "/" : `/?who=${who}`);

/** 홈 대시보드 (F-20). 사람 필터를 바꾸면 모든 숫자가 그 기준으로 바뀐다. */
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireMember();
  const month = currentMonthKST();
  const today = todayKST();
  const { who } = parseFilters(await searchParams, month);
  const members = await getHouseholdMembers();
  const partner = members.find((m) => m.id !== me.id) ?? null;

  const [thisMonthRows, lastPeriodRows, recent, recurring, labels, activity] = await Promise.all([
    getTransactionsInRange(monthRange(month)),
    getTransactionsInRange(samePeriodLastMonth(today)),
    getRecentTransactions(who, 6),
    getRecurringOverview(),
    getLabelMaps(),
    partner ? getLatestActivityBy(partner.id) : Promise.resolve(null),
  ]);

  const names = toMemberNames(members);
  const mine = thisMonthRows.filter((r) => matchesPerson(r, who));
  const totals = sumTotals(mine);
  const lastExpense = sumTotals(lastPeriodRows.filter((r) => matchesPerson(r, who))).expense;
  const recurringRows = recurring.rows.filter((r) => matchesPerson(r.item, who));

  return (
    <>
      <PageHeader title="홈">
        <PersonFilterLinks current={who} names={names} hrefFor={hrefFor} />
      </PageHeader>

      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <ActivityLine activity={activity} partnerName={partner?.displayName ?? null} categoryNames={labels.categories} />
        {partner ? null : (
          <p className="rounded-md bg-primary-soft px-4 py-3 text-body text-ink">
            아직 혼자예요.{" "}
            <Link href="/settings" className="font-semibold text-primary underline-offset-4 hover:underline">
              설정에서 배우자를 초대해 주세요
            </Link>
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <MonthSummary
            monthLabel={`${Number(month.slice(5, 7))}월`}
            totals={totals}
            compareText={compareWithLastMonth(totals.expense, lastExpense)}
            split={who === "all" ? splitByOwner(thisMonthRows) : null}
            names={names}
          />

          <div className="flex flex-col gap-4">
            <SettingsSection title="이번 달 정기지출">
              <RecurringChecklist
                overview={{ rows: recurringRows }}
                names={names}
                paymentMethodNames={labels.paymentMethods}
              />
              <Link href="/recurring" className="mt-3 inline-block text-body font-semibold text-primary underline-offset-4 hover:underline">
                정기지출 관리
              </Link>
            </SettingsSection>

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
      </div>
    </>
  );
}
