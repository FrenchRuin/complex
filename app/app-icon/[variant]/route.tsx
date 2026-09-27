import { appIconResponse } from "@/lib/app-icon";

/** 앱 설치용 아이콘: /app-icon/192, /app-icon/512, /app-icon/maskable */
const VARIANTS: Record<string, { size: number; maskable?: boolean }> = {
  "192": { size: 192 },
  "512": { size: 512 },
  maskable: { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: RouteContext<"/app-icon/[variant]">) {
  const { variant } = await params;
  const options = VARIANTS[variant];
  if (!options) return new Response("아이콘을 찾을 수 없어요", { status: 404 });
  return appIconResponse(options);
}
