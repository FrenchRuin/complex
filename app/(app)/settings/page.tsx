import type { Metadata } from "next";
import { headers } from "next/headers";
import { DisplayNameForm } from "@/components/household/DisplayNameForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategorySection } from "@/components/settings/CategorySection";
import { HouseholdSection } from "@/components/settings/HouseholdSection";
import { PaymentMethodSection } from "@/components/settings/PaymentMethodSection";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { formatMonthDayKST } from "@/lib/date";
import { toOwner, toPaymentKind } from "@/lib/domain";
import { getHouseholdMembers, requireMember, toMemberNames } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { logout, updateDisplayName } from "./actions";

export const metadata: Metadata = { title: "설정 · 우리 둘 가계부" };

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function loadError(error: { message: string }): Error {
  return new Error(`설정을 불러오지 못했어요: ${error.message}`);
}

export default async function SettingsPage() {
  const me = await requireMember();
  const supabase = await createClient();

  const [members, categories, methods, invites, origin] = await Promise.all([
    getHouseholdMembers(),
    supabase.from("categories").select("id, type, name, icon, sort_order, is_hidden"),
    supabase
      .from("payment_methods")
      .select("id, name, kind, owner, sms_aliases, sort_order, is_hidden"),
    supabase
      .from("invites")
      .select("token, expires_at")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
    getOrigin(),
  ]);

  if (categories.error) throw loadError(categories.error);
  if (methods.error) throw loadError(methods.error);
  if (invites.error) throw loadError(invites.error);

  const names = toMemberNames(members);
  const invite = invites.data[0];

  return (
    <>
    <PageHeader title="설정" />
    <div className="flex w-full max-w-[720px] flex-col gap-4 px-5 py-6 lg:px-8">

      <SettingsSection title="프로필" description="앱의 모든 곳에서 이 이름으로 불러요.">
        <DisplayNameForm
          action={updateDisplayName}
          defaultValue={me.displayName}
          submitLabel="저장"
          pendingLabel="저장하는 중"
          successMessage="저장했어요"
        />
      </SettingsSection>

      <HouseholdSection
        members={members}
        origin={origin}
        activeInvite={
          invite ? { token: invite.token, expiresLabel: formatMonthDayKST(invite.expires_at) } : null
        }
      />

      <CategorySection
        categories={categories.data.map((c) => ({
          ...c,
          type: c.type === "income" ? "income" : "expense",
        }))}
      />

      <PaymentMethodSection
        names={names}
        methods={methods.data.map((m) => ({
          ...m,
          kind: toPaymentKind(m.kind),
          owner: toOwner(m.owner),
        }))}
      />

      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full">
          로그아웃
        </Button>
      </form>
    </div>
    </>
  );
}
