"use client";

import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { noteMatches, type Note } from "@/lib/calc/notes";
import type { HouseholdMember } from "@/lib/household";
import { NoteCard } from "./NoteCard";
import { NotePanel } from "./NotePanel";

type Props = { notes: Note[]; members: HouseholdMember[] };
/** 연 메모는 id로 들고, 그릴 때마다 목록에서 찾는다 (저장 뒤 새 내용이 바로 보이게) */
type EditorState = { open: false } | { open: true; noteId: string | null; key: number };

/**
 * 메모 화면 (F-18): 검색, 메모 추가, 카드 목록.
 * ?note=id(알림·홈에서 옴)면 그 메모를, ?new=1(홈에서 옴)이면 새 메모 창을 연다. 닫으면 주소에서 지운다.
 */
export function NotesBoard({ notes, members }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState>({ open: false });

  const open = (note: Note | null) => setEditor({ open: true, noteId: note?.id ?? null, key: Date.now() });
  const openNote = editor.open && editor.noteId ? (notes.find((n) => n.id === editor.noteId) ?? null) : null;

  // 주소로 연 창: 닫으면 주소에서 지운다 (지운 메모 id면 아무것도 열지 않는다)
  const noteParam = params.get("note");
  const fromQuery = noteParam ? (notes.find((n) => n.id === noteParam) ?? null) : null;
  const queryOpen = fromQuery !== null || params.get("new") === "1";
  const closeQuery = () => router.replace(pathname, { scroll: false });

  const shown = notes.filter((note) => noteMatches(note, query));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-sm bg-surface-raised px-3 text-ink-muted">
          <Search size={18} strokeWidth={1.75} aria-hidden />
          <span className="sr-only">메모 검색</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모 검색"
            className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
        <Button onClick={() => open(null)} className="h-11 px-4">
          <Plus size={20} strokeWidth={1.75} aria-hidden />
          메모 추가
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-md bg-surface-raised px-5 py-10 text-center text-body text-ink-muted">
          함께 볼 메모를 남겨 보세요. 장보기처럼 체크리스트로도 쓸 수 있어요.
        </p>
      ) : shown.length === 0 ? (
        <p className="px-1 text-body text-ink-muted">‘{query.trim()}’ 검색 결과가 없어요.</p>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((note) => (
            <li key={note.id} className="min-w-0">
              <NoteCard note={note} members={members} onOpen={open} />
            </li>
          ))}
        </ul>
      )}

      {editor.open && (editor.noteId === null || openNote) ? (
        <NotePanel key={editor.key} note={openNote} members={members} onClose={() => setEditor({ open: false })} />
      ) : queryOpen ? (
        <NotePanel key={`query-${noteParam ?? "new"}`} note={fromQuery} members={members} onClose={closeQuery} />
      ) : null}
    </div>
  );
}
