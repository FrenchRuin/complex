import { requireMember } from "@/lib/household";

/** 가구가 있어야 들어올 수 있는 화면들. 사이드바·탭바는 M2에서 추가한다. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireMember();
  return <>{children}</>;
}
