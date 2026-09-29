import { redirect } from "next/navigation";

/** 예산은 설정에서 사이드바 "예산" 화면으로 옮겼다 (2026-09-29). 옛 주소는 넘겨준다 */
export default function OldBudgetSettingsPage() {
  redirect("/budget");
}
