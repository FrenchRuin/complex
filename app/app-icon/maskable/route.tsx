import { appIconResponse } from "@/lib/app-icon";

/** 앱 설치용 아이콘 (안드로이드가 모양을 잘라내는 maskable용) */
export function GET() {
  return appIconResponse({ size: 512, maskable: true });
}
