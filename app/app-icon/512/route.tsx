import { appIconResponse } from "@/lib/app-icon";

/** 앱 설치용 아이콘 512px */
export function GET() {
  return appIconResponse({ size: 512 });
}
