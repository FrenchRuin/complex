import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "정기지출 · 우리 둘 가계부" };

export default function RecurringPage() {
  return (
    <ComingSoon
      title="정기지출"
      milestone="M3"
      description="매달 나가는 돈을 등록하고 납부를 체크하는 화면은"
    />
  );
}
