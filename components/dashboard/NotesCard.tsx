import { ChevronRight, Pin, Plus } from "lucide-react";
import Link from "next/link";
import { notePreview, type Note } from "@/lib/calc/notes";

/** 홈 메모 카드 (F-18): 고정한 메모 먼저 최대 3개. 폰에서는 여기로 메모 화면에 들어간다 */
export function NotesCard({ notes }: { notes: readonly Note[] }) {
  const top = notes.slice(0, 3);

  return (
    <section aria-labelledby="home-notes" className="rounded-md bg-surface-raised p-5">
      <div className="flex items-center justify-between">
        <Link
          href="/notes"
          id="home-notes"
          className="-m-1 inline-flex items-center gap-1 rounded-sm p-1 text-heading text-ink hover:bg-surface-sunken"
        >
          메모
          <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
        </Link>
        <Link
          href="/notes?new=1"
          className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-body font-semibold text-primary hover:bg-surface-sunken"
        >
          <Plus size={18} strokeWidth={1.75} aria-hidden />
          메모 추가
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="mt-1 text-body text-ink-muted">장보기, 할 일처럼 함께 볼 메모를 남겨 보세요.</p>
      ) : (
        <ul className="mt-2">
          {top.map((note) => {
            const { title, summary } = notePreview(note);
            return (
              <li key={note.id} className="border-b border-line last:border-b-0">
                <Link href={`/notes?note=${note.id}`} className="flex items-center gap-2 py-3 hover:bg-surface-sunken/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">{title}</span>
                    {summary ? <span className="block truncate text-caption text-ink-muted">{summary}</span> : null}
                  </span>
                  {note.isPinned ? (
                    <Pin size={16} strokeWidth={1.75} className="shrink-0 text-primary" aria-label="고정한 메모" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
