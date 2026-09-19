import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();

  return <AppShell session={session}>{children}</AppShell>;
}
