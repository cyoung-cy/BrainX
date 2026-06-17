"use client";

import { useRef, useEffect } from "react";
import { X, Plus, Eye, EyeOff } from "lucide-react";
import { cx } from "@/lib/utils";
import { Tab, MockNote } from "@/lib/notes/noteTypes";
import type { EditMode } from "./NoteEditor";

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  notes: MockNote[];
  mode: EditMode;
  showModeToggle: boolean;
  showCloseButton: boolean;
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onModeToggle: () => void;
  onClosePanel: () => void;
}

function tabLabel(tab: Tab, notes: MockNote[]): string {
  if (tab.kind === "start") return "새 탭";
  return notes.find((n) => n.id === tab.noteId)?.title ?? "제목 없음";
}

export default function TabBar({
  tabs,
  activeTabId,
  notes,
  mode,
  showModeToggle,
  showCloseButton,
  onTabActivate,
  onTabClose,
  onNewTab,
  onModeToggle,
  onClosePanel,
}: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* 활성 탭이 바뀌면 보이는 영역으로 스크롤 */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    activeEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  return (
    <div
      className="flex h-9 shrink-0 items-center border-b border-line/50"
      style={{ background: "rgb(var(--bg2))" }}
    >
      {/* 탭 목록 (가로 스크롤) */}
      <div
        ref={scrollRef}
        className="scroll-x-thin flex h-full flex-1 items-stretch overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {tabs.map((tab) => {
          const label = tabLabel(tab, notes);
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              data-tab-id={tab.id}
              onClick={(e) => { e.stopPropagation(); onTabActivate(tab.id); }}
              title={label}
              className={cx(
                "group relative flex h-full min-w-[110px] max-w-[170px] shrink-0 items-center gap-1.5 border-r px-3 text-[12px] transition-colors",
                isActive
                  ? "font-medium text-txt"
                  : tab.kind === "start"
                  ? "text-txt3/70 hover:text-txt2"
                  : "text-txt3 hover:text-txt2"
              )}
              style={{
                background: isActive ? "rgb(var(--surface))" : "transparent",
                borderColor: "rgb(var(--border) / 0.3)",
              }}
            >
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "rgb(var(--primary))" }}
                />
              )}

              <span className={cx("min-w-0 flex-1 truncate text-left", tab.kind === "start" && "italic")}>
                {label}
              </span>

              {tabs.length > 1 && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  title="탭 닫기"
                  className={cx(
                    "grid h-4 w-4 shrink-0 place-items-center rounded transition-all hover:bg-red-500/15 hover:text-red-400",
                    isActive ? "opacity-50 hover:opacity-100" : "opacity-0 group-hover:opacity-60 group-hover:hover:opacity-100"
                  )}
                >
                  <X size={10} />
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNewTab(); }}
          title="새 탭"
          className="grid h-full w-8 shrink-0 place-items-center text-txt3 transition-colors hover:bg-surface2/50 hover:text-txt"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* 우측 컨트롤: 모드 토글 / 패널 닫기 */}
      <div className="flex shrink-0 items-center gap-0.5 border-l border-line/40 px-1.5">
        {showModeToggle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onModeToggle(); }}
            title={mode === "edit" ? "읽기 모드로 전환" : "편집 모드로 전환"}
            className={cx(
              "inline-flex h-[22px] w-[22px] items-center justify-center rounded transition-all",
              mode === "edit"
                ? "text-primary hover:bg-primary/10"
                : "text-txt3/60 hover:bg-surface2/70 hover:text-txt"
            )}
          >
            {mode === "edit" ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}

        {showCloseButton && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClosePanel(); }}
            title="패널 닫기"
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded text-txt3/60 transition-all hover:bg-red-500/10 hover:text-red-500"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
