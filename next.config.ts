import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 화면 왼쪽 아래 "N" 표시가 버튼을 가려 끈다 (배포에는 원래 없음)
  devIndicators: false,
};

export default nextConfig;
