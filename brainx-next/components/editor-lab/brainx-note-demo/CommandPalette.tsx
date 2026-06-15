"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { MOCK_NOTES } from "./mockData";

interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

interface Props {
  isLight: boolean;
  onClose: () => void;
  onOpenNote: (noteId: string) => void;
}

export default function CommandPalette({ isLight, onClose, onOpenNote }: Props) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const noteCommands: Command[] = MOCK_NOTES.map((n) => ({
    id: `note-${n.id}`,
    label: n.title,
    icon: "📄",
    category: "노트 열기",
    action: () => { onOpenNote(n.id); onClose(); },
  }));

  const systemCommands: Command[] = [
    {
      id: "new-note",
      label: "새 노트 만들기",
      icon: "✚",
      shortcut: "Ctrl+N",
      category: "작업",
      action: () => { alert("새 노트 생성 (구현 예정)"); onClose(); },
    },
    {
      id: "split-right",
      label: "오른쪽 분할",
      icon: "⫸",
      shortcut: "Ctrl+\\",
      category: "화면",
      action: () => { alert("오른쪽 분할"); onClose(); },
    },
    {
      id: "toggle-sidebar",
      label: "사이드바 토글",
      icon: "◧",
      shortcut: "Ctrl+B",
      category: "화면",
      action: () => { onClose(); },
    },
    {
      id: "toggle-dark",
      label: "다크/라이트 모드 전환",
      icon: "◐",
      category: "설정",
      action: () => { onClose(); },
    },
    {
      id: "export-md",
      label: "Markdown으로 내보내기",
      icon: "↗",
      category: "내보내기",
      action: () => { alert("Markdown 내보내기"); onClose(); },
    },
    {
      id: "import-notion",
      label: "Notion에서 가져오기",
      icon: "↙",
      category: "가져오기",
      action: () => { alert("Notion 가져오기"); onClose(); },
    },
    {
      id: "knowledge-graph",
      label: "지식 그래프 열기",
      icon: "⬡",
      category: "뷰",
      action: () => { alert("지식 그래프"); onClose(); },
    },
    {
      id: "zen-mode",
      label: "Zen 모드",
      icon: "◉",
      shortcut: "Ctrl+Shift+Z",
      category: "화면",
      action: () => { onClose(); },
    },
    {
      id: "command-history",
      label: "버전 히스토리 보기",
      icon: "⏱",
      category: "기타",
      action: () => { onClose(); },
    },
  ];

  const allCommands = [...noteCommands, ...systemCommands];

  const filtered = query.trim()
    ? allCommands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        flatFiltered[activeIdx]?.action();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flatFiltered, activeIdx, onClose]);

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={cx(
          "w-full max-w-xl rounded-2xl border shadow-soft overflow-hidden",
          isLight ? "bg-white border-slate-200" : "bg-surface2 border-line/60"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className={cx(
          "flex items-center gap-3 px-4 py-3 border-b",
          isLight ? "border-slate-200" : "border-line/40"
        )}>
          <Search size={16} className={isLight ? "text-slate-400" : "text-txt3"} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="커맨드 또는 노트 검색..."
            className={cx(
              "flex-1 bg-transparent outline-none text-sm",
              isLight ? "text-slate-800 placeholder:text-slate-400" : "text-txt placeholder:text-txt3"
            )}
          />
          <div className={cx("flex items-center gap-1 text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
            <kbd className={cx("px-1.5 py-0.5 rounded text-[10px] border", isLight ? "bg-slate-100 border-slate-200" : "bg-surface border-line/40")}>Esc</kbd>
          </div>
          <button onClick={onClose} className={isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="scroll max-h-[60vh] overflow-y-auto py-1">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className={cx(
                "px-4 py-1 text-[10px] font-semibold uppercase tracking-wide",
                isLight ? "text-slate-400" : "text-txt3"
              )}>
                {category}
              </div>
              {cmds.map((cmd) => {
                const thisIdx = flatIdx++;
                const isActive = thisIdx === activeIdx;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setActiveIdx(thisIdx)}
                    className={cx(
                      "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                      isActive
                        ? isLight ? "bg-blue-50" : "bg-primary/10"
                        : isLight ? "hover:bg-slate-50" : "hover:bg-surface/60"
                    )}
                  >
                    <span className={cx(
                      "w-7 h-7 flex items-center justify-center rounded text-[13px] shrink-0",
                      isLight ? "bg-slate-100" : "bg-surface"
                    )}>
                      {cmd.icon}
                    </span>
                    <span className={cx("flex-1 text-[13px]", isLight ? "text-slate-700" : "text-txt2")}>
                      {cmd.label}
                    </span>
                    {cmd.shortcut && (
                      <kbd className={cx(
                        "px-1.5 py-0.5 rounded text-[10px] border",
                        isLight ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-surface border-line/40 text-txt3"
                      )}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={cx("px-4 py-8 text-center text-sm", isLight ? "text-slate-400" : "text-txt3")}>
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
