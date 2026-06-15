"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cx } from "@/lib/utils";
import { MockNote } from "./types";

interface Props {
  notes: MockNote[];
  activeNoteId: string;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
}

export default function NoteSidebar({ notes, activeNoteId, onDragStart, onDragEnd }: Props) {
  return (
    /* NoteEditorScreen의 노트 목록 패널과 동일한 스타일 */
    <div className="hidden w-60 shrink-0 flex-col border-r border-line/50 bg-bg2/30 md:flex">

      {/* 헤더 */}
      <div className="space-y-2 border-b border-line/50 p-3">
        <div className="flex items-center gap-1.5 px-1 pb-0.5">
          <span className="text-[11px] font-semibold text-txt3">노트 목록</span>
          <span className="ml-auto font-mono text-[10px] text-txt3/60">{notes.length}</span>
        </div>

        {/* 검색 (UI 전용) */}
        <div className="flex h-9 items-center gap-2 rounded-lg border border-line/50 bg-surface2/50 px-2.5">
          <Search size={13} className="shrink-0 text-txt3/70" />
          <span className="text-[13px] text-txt3/60">검색...</span>
        </div>

        <p className="px-1 text-[10px] text-txt3/50">드래그하여 패널에 추가</p>
      </div>

      {/* 노트 목록 */}
      <div className="scroll flex-1 overflow-y-auto p-2">
        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

/* ── 노트 행 (NoteEditorScreen NoteRow와 동일 디자인) ── */
function NoteRow({
  note,
  isActive,
  onDragStart,
  onDragEnd,
}: {
  note: MockNote;
  isActive: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", note.id);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(true);
        onDragStart(note.id);
      }}
      onDragEnd={() => {
        setDragging(false);
        onDragEnd();
      }}
      className={cx(
        "group relative flex h-8 w-full cursor-grab select-none items-center gap-2 rounded-lg pl-2.5 pr-2 text-[13px] transition-colors",
        isActive
          ? "bg-surface2/80 text-txt"
          : "text-txt2 hover:bg-surface2/50",
        dragging && "opacity-40"
      )}
    >
      {/* 활성 표시: NoteRow와 동일한 그라디언트 바 */}
      {isActive && (
        <span className="absolute left-0 -ml-0.5 h-4 w-0.5 rounded-r bg-gradient-to-b from-primary to-accent" />
      )}

      {/* 색상 점 */}
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />

      {/* 제목 */}
      <span className="flex-1 truncate">{note.title}</span>

      {/* 태그 (첫 번째) */}
      {note.tags[0] && (
        <span className="shrink-0 text-[10px] text-txt3/60">
          {note.tags[0]}
        </span>
      )}
    </div>
  );
}
