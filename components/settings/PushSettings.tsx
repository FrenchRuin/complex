"use client";

import { useEffect, useState, useTransition } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPushAction } from "@/app/(app)/settings/push-actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { deviceLabel } from "@/lib/calc/push";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** base64url 공개키 → 브라우저가 받는 바이트 */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iPhone|iPad/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

/** 이 폰에서 휴대폰 알림 켜기·끄기, 시험 알림 (F-57) */
export function PushSettings() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && PUBLIC_KEY !== "";
      if (!supported) return setStatus(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setStatus("denied");
      setStatus((await currentSubscription()) ? "on" : "off");
    })();
  }, []);

  function turnOn() {
    setError(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
          device: deviceLabel(navigator.userAgent),
        });
        if (result.error) return setError(result.error);
        setStatus("on");
        toast("이 폰에서 알림을 받아요");
      } catch {
        setError("알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요");
      }
    });
  }

  function turnOff() {
    setError(null);
    startTransition(async () => {
      const subscription = await currentSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
      toast("이 폰에서 알림을 껐어요");
    });
  }

  function test() {
    setError(null);
    startTransition(async () => {
      const result = await sendTestPushAction();
      if (result.error) return setError(result.error);
      toast("시험 알림을 보냈어요. 잠시 뒤 폰에 알림이 와요");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "checking" ? <p className="text-body text-ink-muted">이 기기를 확인하는 중이에요.</p> : null}
      {status === "ios-install" ? (
        <p className="rounded-sm bg-primary-soft px-4 py-3 text-body text-ink">
          아이폰은 앱을 홈 화면에 추가해야 알림을 받을 수 있어요. 사파리에서 공유 → 홈 화면에 추가 후, 홈 화면의 앱으로 열어 다시 켜 주세요.
        </p>
      ) : null}
      {status === "unsupported" ? (
        <p className="text-body text-ink-muted">이 브라우저는 휴대폰 알림을 지원하지 않아요. 안드로이드는 크롬, 아이폰은 홈 화면에 추가한 앱에서 켜 주세요.</p>
      ) : null}
      {status === "denied" ? (
        <p className="text-body text-ink-muted">
          이 기기에서 알림이 막혀 있어요. 휴대폰 설정 → 알림(또는 브라우저의 사이트 설정)에서 이 앱의 알림을 허용한 뒤 다시 켜 주세요.
        </p>
      ) : null}
      {status === "off" ? (
        <>
          <p className="text-body text-ink">상대가 내역·메모·일정을 바꾸면 이 폰으로도 알림이 와요. 앱 안 알림과 같아요.</p>
          <Button onClick={turnOn} pending={pending} className="w-full">
            {pending ? "켜는 중" : "이 폰에서 알림 받기"}
          </Button>
        </>
      ) : null}
      {status === "on" ? (
        <>
          <p className="text-body text-ink">이 폰에서 알림을 받고 있어요.</p>
          <Button onClick={test} pending={pending} className="w-full">
            {pending ? "보내는 중" : "시험 알림 보내기"}
          </Button>
          <Button variant="secondary" onClick={turnOff} disabled={pending} className="w-full">
            이 폰에서 알림 끄기
          </Button>
        </>
      ) : null}
      <p role="alert" className="text-caption text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
