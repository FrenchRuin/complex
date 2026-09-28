import { appIconResponse } from "@/lib/app-icon";

/** 앱 설치용 아이콘 192px */
export function GET() {
  return appIconResponse({ size: 192 });
}
