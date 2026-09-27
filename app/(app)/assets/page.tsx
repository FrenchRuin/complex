import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "자산·목표 · 우리 둘 가계부" };

export default function AssetsPage() {
  return (
    <ComingSoon
      title="자산·목표"
      milestone="M7"
      description="자산·부채, 순자산 추이, 저축 목표는"
    />
  );
}
