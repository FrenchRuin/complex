"use client";

import { useState } from "react";
import { createInvite } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/Button";
import { PersonChip } from "@/components/ui/PersonChip";
import type { HouseholdMember } from "@/lib/household";
import { SettingsSection } from "./SettingsSection";
import { useActionRunner } from "./useActionRunner";

type Props = {
  members: HouseholdMember[];
  origin: string;
  /** 아직 쓰지 않은 유효한 초대 */
  activeInvite: { token: string; expiresLabel: string } | null;
};

/** 가구 구성원과 초대 링크 (F-02) */
export function HouseholdSection({ members, origin, activeInvite }: Props) {
  const { pending, error, run } = useActionRunner();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const isFull = members.length >= 2;
  const link = activeInvite ? `${origin}/invite/${activeInvite.token}` : null;

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("복사했어요. 배우자에게 보내 주세요");
    } catch {
      setCopyMessage("복사하지 못했어요. 링크를 길게 눌러 직접 복사해 주세요");
    }
  }

  return (
    <SettingsSection
      title="가구"
      description={isFull ? "두 사람이 함께 쓰고 있어요." : "배우자를 초대하면 같은 가계부를 함께 볼 수 있어요."}
    >
      <ul className="flex flex-wrap gap-2" aria-label="구성원">
        {members.map((m) => (
          <li key={m.id}>
            <PersonChip owner={m.slot} label={m.displayName} />
          </li>
        ))}
      </ul>

      {isFull ? null : (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {link && activeInvite ? (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-caption font-semibold text-ink-muted">초대 링크</span>
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-12 rounded-sm bg-surface-sunken px-4 text-caption text-ink"
                />
              </label>
              <p className="text-caption text-ink-muted">
                {activeInvite.expiresLabel}까지 한 번만 쓸 수 있어요.
              </p>
              <div className="flex gap-2">
                <Button onClick={copy} className="flex-1">
                  복사
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setCopyMessage(null);
                    run(createInvite);
                  }}
                  className="flex-1"
                >
                  새 링크 만들기
                </Button>
              </div>
            </>
          ) : (
            <Button pending={pending} onClick={() => run(createInvite)} className="w-full">
              {pending ? "만드는 중" : "초대 링크 만들기"}
            </Button>
          )}
          <p role="status" aria-live="polite" className="min-h-[18px] text-caption">
            {error ? <span className="text-danger">{error}</span> : copyMessage}
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
