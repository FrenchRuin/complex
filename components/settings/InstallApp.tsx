"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "./SettingsSection";

/** 크롬 계열이 주는 설치 이벤트 (표준 타입에 없어 직접 정의) */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Env = "standalone" | "ios" | "other";

function readEnv(): Env {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** 앱으로 설치 안내 (F-53 PWA): 안드로이드는 버튼, 아이폰은 순서 안내 */
export function InstallApp() {
  const env = useSyncExternalStore(subscribe, readEnv, () => "other" as Env);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    }
    function onInstalled() {
      setPrompt(null);
      setMessage("설치했어요. 홈 화면에서 앱 아이콘으로 열어 주세요");
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "dismissed") setMessage("설치를 취소했어요. 다시 하려면 새로고침해 주세요");
  }

  return (
    <SettingsSection
      title="앱으로 설치"
      description="홈 화면에 아이콘이 생기고, 주소창 없이 앱처럼 열려요. 설치해도 두 사람 데이터는 그대로예요."
    >
      {env === "standalone" ? (
        <p className="rounded-sm bg-primary-soft px-3 py-2 text-body text-ink">지금 앱으로 쓰고 있어요.</p>
      ) : env === "ios" ? (
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-body text-ink">
          <li>
            <strong>사파리</strong>로 이 사이트를 열어요. (다른 브라우저에서는 홈 화면에 추가가 안 될 수 있어요)
          </li>
          <li>
            화면 아래(또는 위)의 <strong>공유</strong> 버튼(네모에서 화살표가 위로 나온 모양)을 눌러요.
          </li>
          <li>
            목록을 내려서 <strong>홈 화면에 추가</strong>를 누르고, 오른쪽 위 <strong>추가</strong>를 눌러요.
          </li>
          <li>홈 화면의 ‘감자밭’ 아이콘으로 열어요. 처음 한 번은 다시 로그인해야 할 수 있어요.</li>
        </ol>
      ) : prompt ? (
        <Button onClick={install} className="w-full">
          앱 설치
        </Button>
      ) : (
        <div className="flex flex-col gap-2 text-body text-ink">
          <p>
            <strong>안드로이드</strong>: 크롬 오른쪽 위 <strong>⋮</strong> 메뉴 → <strong>앱 설치</strong> 또는{" "}
            <strong>홈 화면에 추가</strong>를 눌러요.
          </p>
          <p>
            <strong>컴퓨터(크롬·엣지)</strong>: 주소창 오른쪽의 설치 아이콘을 누르거나, 메뉴 → <strong>앱 설치</strong>를 눌러요.
          </p>
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-[18px] text-caption text-ink-muted">
        {message}
      </p>
    </SettingsSection>
  );
}
