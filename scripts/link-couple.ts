/**
 * 1회성 스크립트: Supabase Auth에 수동 생성한 두 계정을 Couple + Profile(A/B)로 연결한다.
 * 사용법: pnpm link-couple <userIdA> <userIdB> [nameA] [nameB]
 */
import { prisma } from "../lib/prisma";

async function main() {
  const [userIdA, userIdB, nameA = "나", nameB = "배우자"] = process.argv.slice(2);

  if (!userIdA || !userIdB) {
    console.error(
      "사용법: pnpm link-couple <userIdA> <userIdB> [nameA] [nameB]\n" +
        "userId는 Supabase 대시보드 Authentication 탭에서 각 계정의 UID를 확인해서 입력.",
    );
    process.exit(1);
  }

  const existing = await prisma.profile.findMany({
    where: { id: { in: [userIdA, userIdB] } },
  });
  if (existing.length > 0) {
    console.error(
      `이미 Profile이 존재하는 계정이 있습니다: ${existing.map((p) => p.id).join(", ")}`,
    );
    process.exit(1);
  }

  const couple = await prisma.$transaction(async (tx) => {
    const couple = await tx.couple.create({
      data: { name: `${nameA} ♥ ${nameB}` },
    });

    await tx.profile.createMany({
      data: [
        { id: userIdA, name: nameA, colorRole: "A", coupleId: couple.id },
        { id: userIdB, name: nameB, colorRole: "B", coupleId: couple.id },
      ],
    });

    return couple;
  });

  console.log(`Couple 생성 완료: ${couple.name} (id: ${couple.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
