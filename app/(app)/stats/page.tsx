import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "통계 · 우리 둘 가계부" };

export default function StatsPage() {
  return (
    <ComingSoon
      title="통계"
      milestone="M5"
      description="월별 지출 그래프, 카테고리·사람별 통계, 공동 지출 정산은"
    />
  );
}
