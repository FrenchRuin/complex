import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotesBoard } from "@/components/notes/NotesBoard";
import { getHouseholdMembers, requireMember } from "@/lib/household";
import { getNotes } from "@/lib/notes";

export const metadata: Metadata = { title: "메모 · 감자밭" };

/** 공유 메모 (F-18): 두 사람이 함께 보는 글·체크리스트 메모 */
export default async function NotesPage() {
  await requireMember();
  const [notes, members] = await Promise.all([getNotes(), getHouseholdMembers()]);

  return (
    <>
      <PageHeader title="메모" />
      <div className="px-5 py-6 lg:px-8">
        <NotesBoard notes={notes} members={members} />
      </div>
    </>
  );
}
