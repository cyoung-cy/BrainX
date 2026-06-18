"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { cx } from "@/lib/utils";
import { MOCK_NOTES, type NoteData } from "./mockData";

interface Props {
  isLight: boolean;
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
}

export default function QuickSwitcher({ isLight, onClose, onSelectNote }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const recent = MOCK_NOTES.slice(0, 3);

  const results: NoteData[] = query.trim()
    ? MOCK_NOTES.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.aliases.some((a) => a.toLowerCase().includes(query.toLowerCase())) ||
          n.tags.some((t) => t.includes(query.toLowerCase()))
      )
    : recent;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[activeIdx]) {
        onSelectNote(results[activeIdx].id);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, activeIdx, onClose, onSelectNote]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={cx(
          "w-full max-w-lg rounded-2xl border shadow-soft overflow-hidden",
          isLight ? "bg-white border-slate-200" : "bg-surface2 border-line/60"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className={cx(
          "flex items-center gap-3 px-4 py-3 border-b",
          isLight ? "border-slate-200" : "border-line/40"
        )}>
          <Search size={16} className={isLight ? "text-slate-400" : "text-txt3"} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노트 빠른 열기..."
            className={cx(
              "flex-1 bg-transparent outline-none text-sm",
              isLight ? "text-slate-800 placeholder:text-slate-400" : "text-txt placeholder:text-txt3"
            )}
          />
          <button onClick={onClose}>
            <X size={16} className={isLight ? "text-slate-400" : "text-txt3"} />
          </button>
        </div>

        {/* Results */}
        <div className="py-1">
          {!query.trim() && (
            <div className={cx("flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold", isLight ? "text-slate-400" : "text-txt3")}>
              <Clock size={11} />
              최근 열었던 노트
            </div>
          )}
          {results.map((note, i) => (
            <button
              key={note.id}
              onClick={() => { onSelectNote(note.id); onClose(); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cx(
                "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                i === activeIdx
                  ? isLight ? "bg-blue-50" : "bg-primary/10"
                  : isLight ? "hover:bg-slate-50" : "hover:bg-surface/60"
              )}
            >
              <span className={cx(
                "w-7 h-7 flex items-center justify-center rounded text-[11px] shrink-0 mt-0.5",
                isLight ? "bg-slate-100 text-slate-500" : "bg-surface text-txt3"
              )}>
                📄
              </span>
              <div className="flex-1 min-w-0">
                <div className={cx("text-[13px] font-medium truncate", isLight ? "text-slate-800" : "text-txt")}>
                  {note.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cx("text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
                    {note.folder}
                  </span>
                  {note.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className={cx(
                      "text-[10px] px-1.5 py-px rounded-full",
                      isLight ? "bg-blue-50 text-blue-500" : "bg-primary/10 text-primary"
                    )}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              {note.status === "draft" && (
                <span className={cx(
                  "text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 self-center",
                  isLight ? "border-amber-200 text-amber-600 bg-amber-50" : "border-line/40 text-txt3"
                )}>
                  초안
                </span>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div className={cx("px-4 py-8 text-center text-sm", isLight ? "text-slate-400" : "text-txt3")}>
              노트를 찾을 수 없습니다
            </div>
          )}
        </div>

        <div className={cx("flex items-center gap-3 px-4 py-2 text-[11px] border-t", isLight ? "border-slate-100 text-slate-400" : "border-line/30 text-txt3")}>
          <span><kbd className={cx("px-1 rounded", isLight ? "bg-slate-100" : "bg-surface")}>↑↓</kbd> 이동</span>
          <span><kbd className={cx("px-1 rounded", isLight ? "bg-slate-100" : "bg-surface")}>Enter</kbd> 열기</span>
          <span><kbd className={cx("px-1 rounded", isLight ? "bg-slate-100" : "bg-surface")}>Esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
