import type { MetadataRoute } from "next";

/** 홈 화면에 앱처럼 설치 (F-53 PWA) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "감자밭",
    short_name: "감자밭",
    description: "둘이 가꾸는 가계부",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // 디자인 토큰 surface(라이트) / primary
    background_color: "#F4F6F8",
    theme_color: "#1B5FAF",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
