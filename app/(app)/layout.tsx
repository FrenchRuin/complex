import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { NotificationsProvider } from "@/components/notifications/NotificationsProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/realtime/OfflineBanner";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import { TransactionPanelProvider } from "@/components/transactions/TransactionPanelProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import {
  getMerchantRules,
  getVisibleCategories,
  getVisiblePaymentMethods,
} from "@/lib/household-data";
import { getMyNotifications } from "@/lib/notifications";
import { getRecurringOverview } from "@/lib/recurring";

/**
 * 가구가 있어야 들어올 수 있는 화면들의 틀.
 * 1024px 이상: 사이드바 고정 + 메인만 스크롤. 미만: 하단 탭바 + 추가 버튼.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireMember();
  const [members, categories, paymentMethods, recurring, rules, notifications] = await Promise.all([
    getHouseholdMembers(),
    getVisibleCategories(),
    getVisiblePaymentMethods(),
    getRecurringOverview(),
    getMerchantRules(),
    getMyNotifications(),
  ]);
  const names = toMemberNames(members);
  const namesById = Object.fromEntries(members.map((m) => [m.id, m.displayName]));
  const meMember = { id: me.id, slot: me.slot, displayName: me.displayName, avatarUrl: me.avatarUrl };

  return (
    <ToastProvider>
      <RealtimeProvider householdId={me.householdId}>
        <NotificationsProvider value={{ items: notifications, names: namesById }}>
        <TransactionPanelProvider
          data={{ categories, paymentMethods, members, names, mySlot: me.slot, rules }}
        >
          <div className="lg:flex lg:h-dvh">
            <Sidebar
              me={meMember}
              members={members}
              names={names}
              paymentMethods={paymentMethods}
              recurringDue={recurring.dueUnpaid}
            />
            <main className="min-w-0 flex-1 pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:overflow-y-auto lg:pb-10">
              <OfflineBanner />
              {children}
            </main>
          </div>
          <MobileTabBar recurringDue={recurring.dueUnpaid} />
        </TransactionPanelProvider>
        </NotificationsProvider>
      </RealtimeProvider>
    </ToastProvider>
  );
}
