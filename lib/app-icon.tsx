import { ImageResponse } from "next/og";

/**
 * 앱 아이콘 그림 (로고가 없어서 도형으로): primary 파란 바탕 + 두 사람을 뜻하는 겹친 동그라미 둘.
 * 이미지 파일이라 CSS 변수를 못 쓰므로 design/tokens.json 값(primary, on-primary)을 그대로 쓴다.
 */
const PRIMARY = "#1B5FAF";
const ON_PRIMARY = "#FFFFFF";

type Options = {
  size: number;
  /** maskable: 안드로이드가 모양을 잘라내도 그림이 남도록 안쪽 여백을 더 둔다 */
  maskable?: boolean;
  /** 모서리를 둥글게 (파비콘용). 홈 화면 아이콘은 OS가 알아서 자른다 */
  rounded?: boolean;
};

export function appIconResponse({ size, maskable = false, rounded = false }: Options): ImageResponse {
  const art = maskable ? 0.5 : 0.62; // 그림이 차지하는 비율
  const circle = size * art * 0.62;
  const offset = circle * 0.3;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PRIMARY,
          borderRadius: rounded ? size * 0.22 : 0,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: circle,
            height: circle,
            borderRadius: circle,
            background: ON_PRIMARY,
            opacity: 0.95,
            left: size / 2 - circle / 2 - offset,
            top: size / 2 - circle / 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: circle,
            height: circle,
            borderRadius: circle,
            background: ON_PRIMARY,
            opacity: 0.55,
            left: size / 2 - circle / 2 + offset,
            top: size / 2 - circle / 2,
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
