import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPushForNotification } from "@/lib/push-server";

const bodySchema = z.object({ id: z.uuid() });

/**
 * DB 트리거가 알림이 새로 생길 때 부른다 (F-57). 알림 번호만 받고, 서버가 DB에서 다시 확인한 뒤 보낸다.
 * 로그인 없이 열려 있지만 "2분 안에 생겼고 아직 안 보낸 알림"만 보내므로 옛 알림을 다시 보내게 할 수 없다.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    return NextResponse.json(await sendPushForNotification(parsed.data.id));
  } catch (error) {
    console.error("푸시 보내기 실패", error);
    return NextResponse.json({ error: "push_failed" }, { status: 500 });
  }
}
