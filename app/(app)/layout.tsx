import { AppShell } from "@/components/app-shell";
import { getSessionProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();

  const partners = session.profile?.coupleId
    ? await prisma.profile.findMany({
        where: { coupleId: session.profile.coupleId },
        orderBy: { colorRole: "asc" },
      })
    : [];

  return (
    <AppShell session={session} partners={partners}>
      {children}
    </AppShell>
  );
}
