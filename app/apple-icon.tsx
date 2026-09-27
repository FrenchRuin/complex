import { appIconResponse } from "@/lib/app-icon";

/** 아이폰 홈 화면 아이콘 (iOS가 모서리를 알아서 둥글게 자른다) */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIconResponse({ size: 180 });
}
