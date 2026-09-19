import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user
    ? await prisma.profile.findUnique({ where: { id: user.id } })
    : null;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {profile ? `${profile.name}님, 환영해요` : "로그인 성공"}
          </CardTitle>
          <CardDescription>
            {profile
              ? `역할: Partner ${profile.colorRole}`
              : "이 계정에 연결된 프로필이 아직 없습니다. Couple/Profile 연결 스크립트를 먼저 실행해주세요."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {profile && (
            <Button className="w-full" nativeButton={false} render={<Link href="/budget" />}>
              가계부로 이동
            </Button>
          )}
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
