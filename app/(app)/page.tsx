import { getSessionProfile } from "@/lib/auth";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const { profile } = await getSessionProfile();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-heading text-lg font-medium">
        {profile ? `${profile.name}님, 안녕하세요` : "안녕하세요"}
      </h1>

      {!profile && (
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="text-base">프로필이 아직 연결되지 않았어요</CardTitle>
            <CardDescription>
              이 계정에 연결된 프로필이 없습니다. scripts/link-couple.ts를 먼저 실행해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
