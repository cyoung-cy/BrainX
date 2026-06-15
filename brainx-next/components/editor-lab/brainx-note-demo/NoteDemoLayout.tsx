"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon, PanelLeft, PanelRight, Maximize2, LayoutTemplate } from "lucide-react";
import { useBrainX } from "@/components/brainx-provider";
import { cx } from "@/lib/utils";
import { MOCK_NOTES } from "./mockData";
import NoteExplorerSidebar from "./NoteExplorerSidebar";
import RightInsightSidebar from "./RightInsightSidebar";
import SplitWorkspace from "./SplitWorkspace";
import CommandPalette from "./CommandPalette";
import QuickSwitcher from "./QuickSwitcher";
import KnowledgeGraphMock from "./KnowledgeGraphMock";
import HistoryExportImportModals from "./HistoryExportImportModals";

type LayoutMode = "normal" | "zen" | "graph";

export default function NoteDemoLayout() {
  const { theme, setTheme } = useBrainX();
  const isLight = theme === "light";

  const [activeNoteId, setActiveNoteId] = useState(MOCK_NOTES[0].id);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("normal");
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  const activeNote = MOCK_NOTES.find((n) => n.id === activeNoteId) ?? MOCK_NOTES[0];
  const isZen = layoutMode === "zen";

  /* Keyboard shortcuts */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); setShowCmdPalette((v) => !v); }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") { e.preventDefault(); setShowQuickSwitcher((v) => !v); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") { e.preventDefault(); setLayoutMode((m) => m === "zen" ? "normal" : "zen"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectNote = useCallback((noteId: string) => {
    setActiveNoteId(noteId);
  }, []);

  return (
    <div
      className={cx(
        "flex h-[100svh] flex-col overflow-hidden",
        isLight ? "bg-slate-100" : "bg-bg"
      )}
    >
      {/* ── Top Header ──────────────────────────────── */}
      {!isZen && (
        <header className={cx(
          "flex h-11 shrink-0 items-center gap-2 border-b px-3",
          isLight ? "border-slate-200 bg-white" : "border-line/50 bg-surface/80"
        )}>
          {/* BrainX logo */}
          <Link href="/editor-lab" className="flex items-center gap-2 shrink-0 group">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">B</span>
            </div>
            <span className={cx("text-[13px] font-semibold hidden sm:block", isLight ? "text-slate-700" : "text-txt")}>
              BrainX Note Demo
            </span>
          </Link>

          <span className={cx("text-[12px] mx-1", isLight ? "text-slate-300" : "text-line/50")}>/</span>

          {/* Active note title */}
          <span className={cx("text-[13px] font-medium truncate max-w-[200px]", isLight ? "text-slate-600" : "text-txt2")}>
            {activeNote.title}
          </span>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {activeNote.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={cx("text-[10px] px-1.5 py-px rounded-full border", isLight ? "border-slate-200 text-slate-500 bg-white" : "border-line/40 text-txt3")}>
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* History/Export/Import/Share */}
            <HistoryExportImportModals
              isLight={isLight}
              activeNoteId={activeNoteId}
              activeNoteTitle={activeNote.title}
            />

            <div className={cx("w-px h-4 mx-0.5", isLight ? "bg-slate-200" : "bg-line/50")} />

            {/* Layout shortcuts */}
            <button
              title="커맨드 팔레트 (Ctrl+P)"
              onClick={() => setShowCmdPalette(true)}
              className={cx("h-7 px-2 rounded text-[11px] border transition-all flex items-center gap-1",
                isLight ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-line/40 text-txt2 hover:bg-surface2")}
            >
              <span className="hidden sm:inline">⌘P</span>
              <span className="sm:hidden">⌘</span>
            </button>

            <button
              title="빠른 열기 (Ctrl+O)"
              onClick={() => setShowQuickSwitcher(true)}
              className={cx("h-7 px-2 rounded text-[11px] border transition-all",
                isLight ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-line/40 text-txt2 hover:bg-surface2")}
            >
              ⌘O
            </button>

            <button
              title="지식 그래프"
              onClick={() => setShowGraph((v) => !v)}
              className={cx("h-7 px-2 rounded text-[11px] border transition-all",
                showGraph
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : isLight ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-line/40 text-txt2 hover:bg-surface2")}
            >
              ⬡
            </button>

            <div className={cx("w-px h-4 mx-0.5", isLight ? "bg-slate-200" : "bg-line/50")} />

            {/* Sidebar toggles */}
            <button
              title={leftOpen ? "왼쪽 사이드바 닫기" : "왼쪽 사이드바 열기"}
              onClick={() => setLeftOpen((v) => !v)}
              className={cx("h-7 w-7 grid place-items-center rounded transition-all",
                leftOpen
                  ? isLight ? "bg-slate-100 text-slate-700" : "bg-surface2 text-txt"
                  : isLight ? "text-slate-400 hover:bg-slate-100" : "text-txt3 hover:bg-surface2")}
            >
              <PanelLeft size={14} />
            </button>

            <button
              title={rightOpen ? "오른쪽 사이드바 닫기" : "오른쪽 사이드바 열기"}
              onClick={() => setRightOpen((v) => !v)}
              className={cx("h-7 w-7 grid place-items-center rounded transition-all",
                rightOpen
                  ? isLight ? "bg-slate-100 text-slate-700" : "bg-surface2 text-txt"
                  : isLight ? "text-slate-400 hover:bg-slate-100" : "text-txt3 hover:bg-surface2")}
            >
              <PanelRight size={14} />
            </button>

            {/* Zen mode */}
            <button
              title="Zen 모드 (Ctrl+Shift+Z)"
              onClick={() => setLayoutMode((m) => m === "zen" ? "normal" : "zen")}
              className={cx("h-7 w-7 grid place-items-center rounded transition-all",
                isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-txt3 hover:bg-surface2 hover:text-txt")}
            >
              <Maximize2 size={14} />
            </button>

            <div className={cx("w-px h-4 mx-0.5", isLight ? "bg-slate-200" : "bg-line/50")} />

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className={cx(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium border transition-all",
                isLight
                  ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  : "bg-surface2 text-txt2 border-line/50 hover:text-txt"
              )}
            >
              {isLight ? <Moon size={12} /> : <Sun size={12} />}
              <span className="hidden sm:inline">{isLight ? "Dark" : "Light"}</span>
            </button>
          </div>
        </header>
      )}

      {/* Zen mode exit bar */}
      {isZen && (
        <div
          className={cx(
            "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 transition-opacity duration-300",
            "opacity-0 hover:opacity-100"
          )}
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <span className="text-white/80 text-[12px]">Zen 모드 — Ctrl+Shift+Z 또는 아래 버튼으로 종료</span>
          <button
            onClick={() => setLayoutMode("normal")}
            className="px-3 py-1 rounded-lg bg-white/20 text-white text-[12px] hover:bg-white/30"
          >
            종료
          </button>
        </div>
      )}

      {/* ── Knowledge Graph Overlay ──────────────── */}
      {showGraph && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowGraph(false)}
        >
          <div
            className={cx("w-full max-w-2xl rounded-2xl border shadow-soft overflow-hidden", isLight ? "bg-white border-slate-200" : "bg-surface2 border-line/60")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cx("flex items-center gap-2 px-4 py-3 border-b", isLight ? "border-slate-200" : "border-line/40")}>
              <span className={cx("text-[13px] font-semibold flex-1", isLight ? "text-slate-700" : "text-txt")}>지식 그래프</span>
              <button onClick={() => setShowGraph(false)} className={isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"}>✕</button>
            </div>
            <div className="p-4">
              <KnowledgeGraphMock
                isLight={isLight}
                activeNoteId={activeNoteId}
                onSelectNote={(id) => { handleSelectNote(id); setShowGraph(false); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Main Body ───────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {!isZen && leftOpen && (
          <NoteExplorerSidebar
            activeNoteId={activeNoteId}
            isLight={isLight}
            onSelectNote={handleSelectNote}
          />
        )}

        {/* Workspace */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <SplitWorkspace isLight={isLight} initialNoteId={activeNoteId} />
        </div>

        {/* Right sidebar */}
        {!isZen && rightOpen && (
          <RightInsightSidebar
            activeNote={activeNote}
            isLight={isLight}
            onSelectNote={handleSelectNote}
          />
        )}
      </div>

      {/* ── Status Bar ──────────────────────────── */}
      {!isZen && (
        <div className={cx(
          "flex h-6 shrink-0 items-center gap-4 border-t px-4 text-[10px]",
          isLight ? "border-slate-200 bg-white text-slate-400" : "border-line/40 bg-surface/80 text-txt3"
        )}>
          <span>✓ 자동 저장됨</span>
          <span>·</span>
          <span>{activeNote.folder}</span>
          <span>·</span>
          <span>{activeNote.status}</span>
          <span>·</span>
          <span>BrainX Note Demo · TipTap v3 · Lowlight</span>
          <div className="flex-1" />
          <span className={cx("px-1.5 py-px rounded-sm", isLight ? "bg-slate-100" : "bg-surface2")}>
            Ctrl+P 커맨드
          </span>
          <span className={cx("px-1.5 py-px rounded-sm", isLight ? "bg-slate-100" : "bg-surface2")}>
            Ctrl+O 열기
          </span>
        </div>
      )}

      {/* ── Overlays ───────────────────────────── */}
      {showCmdPalette && (
        <CommandPalette
          isLight={isLight}
          onClose={() => setShowCmdPalette(false)}
          onOpenNote={handleSelectNote}
        />
      )}
      {showQuickSwitcher && (
        <QuickSwitcher
          isLight={isLight}
          onClose={() => setShowQuickSwitcher(false)}
          onSelectNote={handleSelectNote}
        />
      )}
    </div>
  );
}
