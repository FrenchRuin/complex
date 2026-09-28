"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { removeAvatar, uploadAvatar } from "@/app/(app)/settings/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { Slot } from "@/lib/domain";

type Props = { slot: Slot; name: string; avatarUrl: string | null };

/** 프로필 사진 미리보기 + 바꾸기·삭제 (F-03 개선) */
export function AvatarUploadForm({ slot, name, avatarUrl }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("avatar", file);
    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (result.error) return setError(result.error);
      toast("사진을 바꿨어요");
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.error) return setError(result.error);
      toast("사진을 지웠어요");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Avatar slot={slot} name={name} avatarUrl={avatarUrl} size="lg" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onChange}
            className="sr-only"
            aria-label="프로필 사진 파일 선택"
          />
          <Button
            type="button"
            variant="secondary"
            pending={pending}
            onClick={() => inputRef.current?.click()}
            className="h-10 px-4"
          >
            {pending ? "처리하는 중" : "사진 바꾸기"}
          </Button>
          {avatarUrl ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="h-10 text-caption text-ink-muted underline underline-offset-2 disabled:opacity-60"
            >
              사진 삭제
            </button>
          ) : null}
        </div>
      </div>
      <p role="alert" className="text-caption text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
