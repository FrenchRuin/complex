import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "커플 라이프 매니저",
  description: "가계부, 일정관리, 여행계획을 함께 쓰는 커플 전용 웹 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 이 환경의 @base-ui/react 버전에서 다이얼로그/셀렉트 등의 닫기 애니메이션 완료 감지가
            멈춰서(getAnimations()가 절대 resolve 안 됨) 팝업이 영원히 열려있는 채로 걸리는 버그가 있음.
            애니메이션 대기를 완전히 건너뛰게 하는 공식 탈출구 플래그로 우회. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "globalThis.BASE_UI_ANIMATIONS_DISABLED = true;",
          }}
        />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden">{children}</body>
    </html>
  );
}
