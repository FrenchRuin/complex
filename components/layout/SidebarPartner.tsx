"use client";

import { MoodBadge } from "@/components/mood/MoodBadge";
import { useOnlineMembers } from "@/components/realtime/PresenceProvider";
import { Avatar } from "@/components/ui/Avatar";
import { moodOf, type TodayMood } from "@/lib/calc/mood";
import type { HouseholdMember } from "@/lib/household";
import { DOT_STATUS } from "./status";

export const PRESENCE_LABEL = { online: "접속 중", offline: "접속 안 함" } as const;

/** 상대가 지금 앱을 열어 두었는지 */
export function usePartnerPresence(partner: HouseholdMember): keyof typeof PRESENCE_LABEL {
  return useOnlineMembers().has(partner.id) ? "online" : "offline";
}

/** 사이드바 아래 상대 줄 (내 프로필 위): 아바타(접속 점) + 이름 + 기분, 아래에 접속 상태 */
export function SidebarPartner({ partner, mood }: { partner: HouseholdMember; mood: TodayMood | undefined }) {
  const presence = usePartnerPresence(partner);
  return (
    <div className="flex min-h-11 min-w-0 items-center gap-2">
      <span className="relative shrink-0" title={PRESENCE_LABEL[presence]}>
        <Avatar slot={partner.slot} name={partner.displayName} avatarUrl={partner.avatarUrl} />
        <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[presence]}`} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-ink">
          {partner.displayName}
          {mood ? (
            <>
              <span aria-hidden> {moodOf(mood.mood).emoji}</span>
              <span className="sr-only">
                {" "}
                · {partner.displayName} 기분 {moodOf(mood.mood).label}
              </span>
            </>
          ) : null}
        </span>
        <span className="text-caption text-ink-muted">{PRESENCE_LABEL[presence]}</span>
      </span>
    </div>
  );
}

/** 접힌 사이드바의 상대 아바타 (접속 점 + 기분) */
export function RailPartner({ partner, mood }: { partner: HouseholdMember; mood: TodayMood | undefined }) {
  const presence = usePartnerPresence(partner);
  return (
    <span className="relative" title={`${partner.displayName} · ${PRESENCE_LABEL[presence]}`}>
      <Avatar slot={partner.slot} name={partner.displayName} avatarUrl={partner.avatarUrl} />
      <MoodBadge name={partner.displayName} mood={mood} className="-top-1 -right-1" />
      <span aria-hidden className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-surface-raised ${DOT_STATUS[presence]}`} />
      <span className="sr-only">
        {partner.displayName} · {PRESENCE_LABEL[presence]}
      </span>
    </span>
  );
}
