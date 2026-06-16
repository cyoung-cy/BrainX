"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Star, ChevronDown, ChevronRight, FileText, Folder, Check, Clock } from "lucide-react";
import { cx } from "@/lib/utils";
import { MockNote, NoteCategory, SortOption } from "./types";

/* ── 폴더 설정 ─────────────────────────────────────── */
interface FolderConfig {
  id: NoteCategory;
  label: string;
  iconColor: string;
}

const FOLDERS: FolderConfig[] = [
  { id: "backend",      label: "Backend",      iconColor: "#60a5fa" },
  { id: "frontend",     label: "Frontend",     iconColor: "#4ade80" },
  { id: "ai",           label: "AI",           iconColor: "rgb(var(--accent))" },
  { id: "architecture", label: "Architecture", iconColor: "#fb923c" },
  { id: "database",     label: "Database",     iconColor: "rgb(var(--cyan))" },
  { id: "devops",       label: "DevOps",       iconColor: "#818cf8" },
];

/* ── 정렬 옵션 ─────────────────────────────────────── */
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "modified",  label: "최근 수정순" },
  { value: "viewed",    label: "최근 열람순" },
  { value: "created",   label: "생성일순" },
  { value: "title",     label: "제목순" },
  { value: "favorites", label: "즐겨찾기 우선" },
  { value: "ai",        label: "AI 추천순" },
];

/* ── 정렬 함수 ─────────────────────────────────────── */
function sortNotes(notes: MockNote[], sortBy: SortOption, favorites: Set<string>): MockNote[] {
  const arr = [...notes];
  switch (sortBy) {
    case "modified":
    case "viewed":
      return arr.sort((a, b) => b.updatedAt - a.updatedAt);
    case "created":
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    case "title":
      return arr.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    case "favorites":
      return arr.sort((a, b) => {
        const fa = favorites.has(a.id) ? 1 : 0;
        const fb = favorites.has(b.id) ? 1 : 0;
        return fb - fa || a.title.localeCompare(b.title, "ko");
      });
    case "ai":
      return arr;
  }
}

/* ── 커스텀 정렬 드롭다운 ──────────────────────────── */
function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
          open
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-line/50 bg-surface2/40 text-txt2 hover:border-line/80 hover:bg-surface2/70"
        )}
      >
        <Clock size={10} className="shrink-0" />
        <span className="max-w-[80px] truncate">{current.label}</span>
        <ChevronDown size={9} className={cx("shrink-0 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-line/60 bg-surface py-1"
          style={{ boxShadow: "0 8px 24px -4px rgba(2,6,23,0.45), 0 0 0 1px rgb(var(--border)/0.25)" }}
        >
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cx(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors",
                o.value === value
                  ? "bg-primary/8 text-primary"
                  : "text-txt2 hover:bg-surface2/60 hover:text-txt"
              )}
            >
              <Check
                size={10}
                className={cx("shrink-0 transition-opacity", o.value === value ? "opacity-100 text-primary" : "opacity-0")}
              />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Props ──────────────────────────────────────────── */
interface Props {
  notes: MockNote[];
  activeNoteId: string;
  onNoteClick: (noteId: string) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
}

/* ── 메인 컴포넌트 ──────────────────────────────────── */
export default function NoteSidebar({ notes, activeNoteId, onNoteClick, onDragStart, onDragEnd }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("modified");
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(["spring", "brainx-arch", "rag-flow"])
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<NoteCategory>>(
    () => new Set<NoteCategory>(["backend", "frontend", "ai", "architecture"])
  );
  const [favExpanded, setFavExpanded] = useState(true);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q));
  }, [notes, search]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: NoteCategory) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const favNotes = useMemo(
    () => sortNotes(filtered.filter((n) => favorites.has(n.id)), sortBy, favorites),
    [filtered, sortBy, favorites]
  );

  return (
    <div className="hidden w-60 shrink-0 flex-col border-r border-line/50 md:flex" style={{ background: "rgb(var(--bg2))" }}>

      {/* ── 헤더 ──────────────────────────────────────── */}
      <div className="border-b border-line/50 px-3 py-3 space-y-2">
        {/* 타이틀 + 카운트 */}
        <div className="flex items-center px-0.5">
          <span className="text-[12px] font-semibold text-txt">노트 탐색기</span>
          <span
            className="ml-2 rounded-full px-1.5 py-px text-[10px] font-medium text-txt3"
            style={{ background: "rgb(var(--surface2))" }}
          >
            {notes.length}
          </span>
        </div>

        {/* 검색창 */}
        <div
          className="flex h-8 items-center gap-2 rounded-lg border border-line/50 px-2.5 transition-colors focus-within:border-primary/50"
          style={{ background: "rgb(var(--surface))" }}
        >
          <Search size={12} className="shrink-0 text-txt3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="노트 검색..."
            className="flex-1 bg-transparent text-[12px] text-txt outline-none placeholder:text-txt3"
          />
        </div>

        {/* 정렬 */}
        <div className="flex items-center gap-2 px-0.5">
          <span className="text-[10px] font-medium text-txt3">정렬</span>
          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* ── 콘텐츠 ──────────────────────────────────── */}
      <div className="scroll flex-1 overflow-y-auto py-2">

        {/* 즐겨찾기 */}
        {favNotes.length > 0 && (
          <div className="mb-1 px-2">
            <button
              onClick={() => setFavExpanded((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface2/40"
            >
              {favExpanded
                ? <ChevronDown size={11} className="shrink-0 text-txt3" />
                : <ChevronRight size={11} className="shrink-0 text-txt3" />
              }
              <Star size={11} className="shrink-0 fill-yellow-400 text-yellow-400" />
              <span className="flex-1 text-[11px] font-semibold text-txt">즐겨찾기</span>
              <span className="text-[10px] text-txt3">{favNotes.length}</span>
            </button>

            {favExpanded && (
              <div className="mt-0.5 pl-3">
                {favNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    isActive={note.id === activeNoteId}
                    isFavorite
                    iconColor="#f59e0b"
                    onNoteClick={onNoteClick}
                    onToggleFavorite={toggleFavorite}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 구분선 */}
        {favNotes.length > 0 && (
          <div className="mx-3 my-2 border-t border-line/30" />
        )}

        {/* 폴더 목록 */}
        <div className="px-2">
          {FOLDERS.map((folder) => {
            const folderNotes = sortNotes(
              filtered.filter((n) => n.category === folder.id),
              sortBy,
              favorites
            );
            if (folderNotes.length === 0) return null;
            const expanded = expandedFolders.has(folder.id);

            return (
              <div key={folder.id} className="mb-0.5">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface2/40"
                >
                  {expanded
                    ? <ChevronDown size={11} className="shrink-0 text-txt3" />
                    : <ChevronRight size={11} className="shrink-0 text-txt3" />
                  }
                  <Folder size={11} className="shrink-0" style={{ color: folder.iconColor }} />
                  <span className="flex-1 text-[11px] font-semibold text-txt">{folder.label}</span>
                  <span className="text-[10px] text-txt3">{folderNotes.length}</span>
                </button>

                {expanded && (
                  <div className="mt-0.5 pl-3">
                    {folderNotes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        isActive={note.id === activeNoteId}
                        isFavorite={favorites.has(note.id)}
                        iconColor={folder.iconColor}
                        onNoteClick={onNoteClick}
                        onToggleFavorite={toggleFavorite}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 드래그 힌트 */}
        <div className="mx-3 mt-3 rounded-lg border border-line/30 px-3 py-2">
          <p className="text-[10px] leading-relaxed text-txt3">
            <span className="font-medium text-txt3">클릭</span> → 현재 패널 교체
            <br />
            <span className="font-medium text-txt3">드래그</span> → 패널 분할
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 노트 행 ────────────────────────────────────────── */
function NoteRow({
  note,
  isActive,
  isFavorite,
  iconColor,
  onNoteClick,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
}: {
  note: MockNote;
  isActive: boolean;
  isFavorite: boolean;
  iconColor: string;
  onNoteClick: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onClick={() => onNoteClick(note.id)}
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cx(
        "group relative flex h-7 w-full cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 pr-1 text-[12px] transition-colors",
        isActive
          ? "font-medium text-txt"
          : "text-txt2 hover:text-txt",
        dragging && "opacity-40"
      )}
      style={{
        background: isActive ? "rgb(var(--primary) / 0.12)" : hovered ? "rgb(var(--surface2) / 0.6)" : "transparent",
      }}
    >
      {/* 활성 바 */}
      {isActive && (
        <span
          className="absolute left-0 h-4 w-0.5 rounded-r"
          style={{ background: "rgb(var(--primary))", marginLeft: "-1px" }}
        />
      )}

      <FileText
        size={11}
        className="shrink-0"
        style={{ color: isActive ? iconColor : "rgb(var(--txt3))" }}
      />
      <span className="flex-1 truncate">{note.title}</span>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }}
        className={cx(
          "shrink-0 p-0.5 transition-opacity",
          isFavorite ? "opacity-100" : hovered ? "opacity-50" : "opacity-0"
        )}
        title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
      >
        <Star
          size={10}
          className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-txt3"}
        />
      </button>
    </div>
  );
}
