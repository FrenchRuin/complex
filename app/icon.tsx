import { appIconResponse } from "@/lib/app-icon";

/** 브라우저 탭 아이콘 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return appIconResponse({ size: 64, rounded: true });
}
