import { activityAction, activitySentence, relativeDayLabel } from "@/lib/calc/dashboard";
import { todayKST } from "@/lib/date";
import type { PartnerActivity } from "@/lib/transactions";

type Props = {
  activity: PartnerActivity | null;
  partnerName: string | null;
  categoryNames: Record<string, { name: string }>;
};

/** 홈 위쪽 한 줄: 상대의 가장 최근 활동 (F-14) */
export function ActivityLine({ activity, partnerName, categoryNames }: Props) {
  if (!activity || !partnerName) return null;

  const action = activityAction(activity);
  const at = action === "deleted" && activity.deletedAt ? activity.deletedAt : activity.updatedAt;
  const sentence = activitySentence({
    name: partnerName,
    when: relativeDayLabel(todayKST(new Date(at)), todayKST()),
    subject: activity.subjectMerchant ?? categoryNames[activity.categoryId]?.name ?? "내역",
    amount: activity.amount,
    action,
  });

  return (
    <p className="rounded-md bg-primary-soft px-4 py-3 text-body text-ink tabular-nums">{sentence}</p>
  );
}
