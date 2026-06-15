"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Star, Clock, Calendar, Folder } from "lucide-react";
import { cx } from "@/lib/utils";
import { MOCK_NOTES, MOCK_FOLDERS, DAILY_NOTE_DATES, type NoteData } from "./mockData";

interface Props {
  activeNoteId: string;
  isLight: boolean;
  onSelectNote: (noteId: string) => void;
}

export default function NoteExplorerSidebar({ activeNoteId, isLight, onSelectNote }: Props) {
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["arch", "frontend", "ai"]));
  const [section, setSection] = useState<"explorer" | "search" | "recent" | "favorites">("explorer");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["brainx-msa", "tiptap-editor"]));

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = search.trim()
    ? MOCK_NOTES.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.tags.some((t) => t.includes(search.toLowerCase())) ||
          n.content.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className={cx(
      "flex w-56 shrink-0 flex-col border-r overflow-hidden",
      isLight ? "border-slate-200 bg-slate-50/80" : "border-line/50 bg-bg2/30"
    )}>
      {/* Header */}
      <div className={cx("border-b px-3 py-2.5", isLight ? "border-slate-200" : "border-line/50")}>
        <div className="flex items-center gap-1 mb-2">
          {[
            { id: "explorer", icon: Folder, title: "탐색기" },
            { id: "search", icon: Search, title: "검색" },
            { id: "recent", icon: Clock, title: "최근" },
            { id: "favorites", icon: Star, title: "즐겨찾기" },
          ].map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => setSection(id as typeof section)}
              className={cx(
                "flex-1 p-1.5 rounded text-center transition-all",
                section === id
                  ? isLight ? "bg-white shadow-sm text-primary border border-slate-200" : "bg-surface2 text-primary"
                  : isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"
              )}
            >
              <Icon size={13} className="mx-auto" />
            </button>
          ))}
        </div>
        <div className={cx(
          "flex items-center gap-2 h-8 rounded-lg border px-2",
          isLight ? "border-slate-200 bg-white" : "border-line/50 bg-surface2/50"
        )}>
          <Search size={11} className={isLight ? "text-slate-400" : "text-txt3"} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setSection("search"); }}
            placeholder="검색..."
            className={cx("flex-1 bg-transparent text-[12px] outline-none", isLight ? "text-slate-700 placeholder:text-slate-400" : "text-txt placeholder:text-txt3")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="scroll flex-1 overflow-y-auto py-1">
        {/* Search results */}
        {section === "search" && (
          <>
            {search.trim() ? (
              filtered.length > 0 ? (
                <div className="px-2">
                  <div className={cx("px-2 py-1 text-[10px] font-semibold", isLight ? "text-slate-400" : "text-txt3")}>
                    {filtered.length}개 결과
                  </div>
                  {filtered.map((n) => (
                    <NoteRow key={n.id} note={n} active={n.id === activeNoteId} isLight={isLight} isFav={favorites.has(n.id)} onSelect={() => onSelectNote(n.id)} onToggleFav={() => toggleFav(n.id)} />
                  ))}
                </div>
              ) : (
                <div className={cx("px-4 py-8 text-center text-[12px]", isLight ? "text-slate-400" : "text-txt3")}>
                  검색 결과 없음
                </div>
              )
            ) : (
              <div className={cx("px-4 py-4 text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
                <p className="mb-2 font-medium">검색 필터</p>
                {["제목", "본문", "#태그", "시맨틱 검색"].map((f) => (
                  <button key={f} className={cx("block w-full text-left py-1 hover:text-primary transition-colors", isLight ? "text-slate-500" : "text-txt2")}>
                    · {f}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Recent */}
        {section === "recent" && (
          <div className="px-2">
            <div className={cx("px-2 py-1 text-[10px] font-semibold", isLight ? "text-slate-400" : "text-txt3")}>최근 열람</div>
            {MOCK_NOTES.slice(0, 5).map((n) => (
              <NoteRow key={n.id} note={n} active={n.id === activeNoteId} isLight={isLight} isFav={favorites.has(n.id)} onSelect={() => onSelectNote(n.id)} onToggleFav={() => toggleFav(n.id)} />
            ))}
            <div className={cx("px-2 py-1 mt-2 text-[10px] font-semibold", isLight ? "text-slate-400" : "text-txt3")}>데일리 노트</div>
            {DAILY_NOTE_DATES.map((date) => (
              <button
                key={date}
                className={cx(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[12px] transition-colors",
                  isLight ? "text-slate-600 hover:bg-white" : "text-txt2 hover:bg-surface2/50"
                )}
              >
                <Calendar size={11} className={isLight ? "text-slate-400" : "text-txt3"} />
                {date}
              </button>
            ))}
          </div>
        )}

        {/* Favorites */}
        {section === "favorites" && (
          <div className="px-2">
            <div className={cx("px-2 py-1 text-[10px] font-semibold", isLight ? "text-slate-400" : "text-txt3")}>즐겨찾기</div>
            {MOCK_NOTES.filter((n) => favorites.has(n.id)).map((n) => (
              <NoteRow key={n.id} note={n} active={n.id === activeNoteId} isLight={isLight} isFav={true} onSelect={() => onSelectNote(n.id)} onToggleFav={() => toggleFav(n.id)} />
            ))}
            {favorites.size === 0 && (
              <p className={cx("px-2 py-4 text-[12px] text-center", isLight ? "text-slate-400" : "text-txt3")}>
                노트 행 우측 ★ 로 즐겨찾기 추가
              </p>
            )}
          </div>
        )}

        {/* Explorer (folder tree) */}
        {section === "explorer" && (
          <div className="px-2">
            {/* Folder tree */}
            {MOCK_FOLDERS.map((folder) => {
              const folderNotes = MOCK_NOTES.filter((n) => n.folder === folder.label);
              const isOpen = expandedFolders.has(folder.id);
              return (
                <div key={folder.id}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className={cx(
                      "flex w-full items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                      isLight ? "text-slate-500 hover:bg-white" : "text-txt3 hover:bg-surface2/50"
                    )}
                  >
                    {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    <Folder size={11} className={isLight ? "text-amber-500" : "text-accent/70"} />
                    <span className="flex-1 text-left">{folder.label}</span>
                    <span className={cx("text-[10px]", isLight ? "text-slate-400" : "text-txt3/60")}>{folder.noteCount}</span>
                  </button>
                  {isOpen && (
                    <div className="ml-3">
                      {folderNotes.map((n) => (
                        <NoteRow
                          key={n.id}
                          note={n}
                          active={n.id === activeNoteId}
                          isLight={isLight}
                          isFav={favorites.has(n.id)}
                          onSelect={() => onSelectNote(n.id)}
                          onToggleFav={() => toggleFav(n.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Context menu hint */}
            <p className={cx("px-2 mt-3 text-[10px]", isLight ? "text-slate-400" : "text-txt3/60")}>
              우클릭: 이름 변경 · 삭제 · 이동
            </p>
          </div>
        )}
      </div>

      {/* New note button */}
      <div className={cx("border-t px-3 py-2", isLight ? "border-slate-200" : "border-line/50")}>
        <button
          onClick={() => alert("새 노트 생성 (구현 예정)")}
          className={cx(
            "w-full py-1.5 rounded-lg text-[12px] font-medium border transition-all",
            isLight
              ? "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
              : "border-line/40 text-txt2 hover:border-primary/40 hover:text-primary"
          )}
        >
          + 새 노트
        </button>
      </div>
    </div>
  );
}

/* ── Note row ─────────────────────────────────── */
function NoteRow({
  note,
  active,
  isLight,
  isFav,
  onSelect,
  onToggleFav,
}: {
  note: NoteData;
  active: boolean;
  isLight: boolean;
  isFav: boolean;
  onSelect: () => void;
  onToggleFav: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cx(
        "group relative flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[12px]",
        active
          ? isLight ? "bg-white border border-slate-200 shadow-sm text-slate-800" : "bg-surface2/80 text-txt"
          : isLight ? "text-slate-600 hover:bg-white" : "text-txt2 hover:bg-surface2/50"
      )}
    >
      {active && (
        <span className="absolute left-0 -ml-0.5 h-4 w-0.5 rounded-r bg-gradient-to-b from-primary to-accent" />
      )}
      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-primary" : "bg-accent/50")} />
      <span className="flex-1 truncate">{note.title}</span>
      {note.status === "draft" && (
        <span className={cx("text-[9px] px-1 py-px rounded shrink-0", isLight ? "bg-amber-100 text-amber-600" : "bg-amber-500/10 text-amber-400")}>초안</span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={cx(
          "shrink-0 transition-all",
          isFav ? "text-amber-400" : isLight ? "text-slate-300 hover:text-amber-400" : "text-txt3/40 hover:text-amber-400",
          !hovered && !isFav && "opacity-0 group-hover:opacity-100"
        )}
      >
        <Star size={10} fill={isFav ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
