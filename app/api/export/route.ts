import { buildExportSheets, exportFileName } from "@/lib/calc/export-sheets";
import { readExportData } from "@/lib/export/read";
import { buildXlsx } from "@/lib/export/xlsx";
import { getCurrentMember } from "@/lib/household";

const TEXT = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

/**
 * 엑셀 내보내기(F-52): 로그인한 사람의 가구 데이터 전체를 .xlsx로 내려준다. 파일은 어디에도 저장하지 않는다.
 * 로그인 안 한 요청은 proxy가 먼저 로그인 화면으로 보낸다. 실패하면 데이터 내보내기 화면(?error=1)으로 돌려보낸다. 한글 파일 이름은 filename*로(헤더는 ASCII만 안전).
 */
export async function GET(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return new Response("로그인이 필요해요.", { status: 401, headers: TEXT });
    const data = await readExportData();
    const file = await buildXlsx(buildExportSheets(data));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gamjabat-backup-${data.today}.xlsx"; filename*=UTF-8''${encodeURIComponent(exportFileName(data.today))}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("내보내기 실패", error);
    // 화면으로 돌려보내 안내한다. 글자만 있는 화면은 아이폰 홈 화면 앱에서 돌아갈 길이 없다
    return Response.redirect(new URL("/settings/export?error=1", request.url), 303);
  }
}
