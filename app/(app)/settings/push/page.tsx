import type { Metadata } from "next";
import { PushSettings } from "@/components/settings/PushSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsSubpage } from "@/components/settings/SettingsSubpage";
import { notificationTimeLabel } from "@/lib/calc/notifications";
import { requireMember } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "휴대폰 알림 · 설정 · 우리 둘 가계부" };

/** 설정 → 휴대폰 알림 (F-57): 이 폰 켜기·끄기, 시험 알림, 알림 받는 내 기기 목록 */
export default async function PushSettingsPage() {
  await requireMember();
  const supabase = await createClient();
  // RLS가 내 기기만 보여준다
  const { data: devices } = await supabase
    .from("push_subscriptions")
    .select("id, device, created_at, last_used_at")
    .order("created_at", { ascending: false });

  return (
    <SettingsSubpage title="휴대폰 알림">
      <SettingsSection
        title="이 기기"
        description="앱을 닫아도 잠금 화면에 알림이 와요. 기기마다 따로 켜요. 아이폰은 홈 화면에 추가한 앱에서만 돼요."
      >
        <PushSettings />
      </SettingsSection>
      <SettingsSection title="알림 받는 내 기기" description="폰을 바꿨다면 새 폰에서 다시 켜 주세요. 쓰지 않는 기기는 알림을 보낼 때 자동으로 정리돼요.">
        {devices && devices.length > 0 ? (
          <ul>
            {devices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <span className="text-body text-ink">{d.device || "기기"}</span>
                <span className="text-caption text-ink-muted">
                  {d.last_used_at ? `${notificationTimeLabel(d.last_used_at)} 마지막 알림` : `${notificationTimeLabel(d.created_at)} 켬`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">아직 알림을 켠 기기가 없어요.</p>
        )}
      </SettingsSection>
    </SettingsSubpage>
  );
}
