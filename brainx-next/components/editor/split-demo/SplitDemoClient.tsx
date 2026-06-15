"use client";

import { useState, useCallback } from "react";
import { Columns2, Rows2, X, RotateCcw, ChevronLeft } from "lucide-react";
import { cx } from "@/lib/utils";
import { PaneNode } from "./types";
import { MOCK_NOTES, getRandomNote } from "./mockData";
import {
  uid,
  splitNode,
  splitNodeAt,
  closeNode,
  setNoteOnLeaf,
  countLeaves,
  findFirstLeafId,
  findLeafNoteId,
  DropZone,
} from "./paneUtils";
import { AUTO_THEME } from "./theme";
import { SplitThemeContext } from "./SplitThemeContext";
import PaneTreeRenderer from "./PaneTreeRenderer";
import NoteSidebar from "./NoteSidebar";
import ContextPanel from "./ContextPanel";

function createInitialState(): { root: PaneNode; activeId: string } {
  const rootId = uid();
  return {
    root: { type: "leaf", id: rootId, noteId: MOCK_NOTES[0].id },
    activeId: rootId,
  };
}

export default function SplitDemoClient() {
  const [state, setState] = useState<{ root: PaneNode; activeId: string }>(createInitialState);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);

  const panelCount = countLeaves(state.root);
  const activeNoteId = findLeafNoteId(state.root, state.activeId) ?? MOCK_NOTES[0].id;
  const activeNote = MOCK_NOTES.find((n) => n.id === activeNoteId) ?? MOCK_NOTES[0];

  /* ── 분할 핸들러 ────────────────────────────────── */
  const handleSplitRight = useCallback((id: string) => {
    const newLeafId = uid();
    setState((prev) => ({
      root: splitNode(prev.root, id, "horizontal", getRandomNote().id, newLeafId),
      activeId: newLeafId,
    }));
  }, []);

  const handleSplitDown = useCallback((id: string) => {
    const newLeafId = uid();
    setState((prev) => ({
      root: splitNode(prev.root, id, "vertical", getRandomNote().id, newLeafId),
      activeId: newLeafId,
    }));
  }, []);

  const handleClose = useCallback((id: string) => {
    setState((prev) => {
      const newRoot = closeNode(prev.root, id);
      if (!newRoot) return prev;
      const newActiveId =
        prev.activeId === id ? (findFirstLeafId(newRoot) ?? prev.activeId) : prev.activeId;
      return { root: newRoot, activeId: newActiveId };
    });
  }, []);

  const handleChangeNote = useCallback((paneId: string, noteId: string) => {
    setState((prev) => ({ ...prev, root: setNoteOnLeaf(prev.root, paneId, noteId) }));
  }, []);

  const handleActivate = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  }, []);

  const handleDrop = useCallback((paneId: string, zone: DropZone, noteId: string) => {
    if (zone === "center") {
      setState((prev) => ({ ...prev, root: setNoteOnLeaf(prev.root, paneId, noteId) }));
      return;
    }
    const newLeafId = uid();
    const direction: "horizontal" | "vertical" =
      zone === "left" || zone === "right" ? "horizontal" : "vertical";
    const position: "before" | "after" =
      zone === "left" || zone === "top" ? "before" : "after";
    setState((prev) => ({
      root: splitNodeAt(prev.root, paneId, direction, noteId, newLeafId, position),
      activeId: newLeafId,
    }));
  }, []);

  return (
    <SplitThemeContext.Provider value={AUTO_THEME}>
      {/* h-full fills WorkspaceShell <main> flex-1 area */}
      <div className="flex h-full overflow-hidden">

        {/* ── 왼쪽: 노트 목록 (NoteEditorScreen w-60 동일) ── */}
        <NoteSidebar
          notes={MOCK_NOTES}
          activeNoteId={activeNoteId}
          onDragStart={(id) => setDragNoteId(id)}
          onDragEnd={() => setDragNoteId(null)}
        />

        {/* ── 중앙: 분할 에디터 영역 ─────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* 툴바 — NoteEditorScreen toolbar 스타일 */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line/50 px-5 py-2.5">
            <span className="text-[12px] text-txt3">
              {panelCount}개 패널 열림
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <ToolbarBtn
                onClick={() => handleSplitRight(state.activeId)}
                title="활성 패널 오른쪽 분할"
              >
                <Columns2 size={13} />
                <span>오른쪽</span>
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => handleSplitDown(state.activeId)}
                title="활성 패널 아래 분할"
              >
                <Rows2 size={13} />
                <span>아래</span>
              </ToolbarBtn>
              {panelCount > 1 && (
                <ToolbarBtn
                  onClick={() => handleClose(state.activeId)}
                  title="활성 패널 닫기"
                  danger
                >
                  <X size={13} />
                  <span>닫기</span>
                </ToolbarBtn>
              )}
              <div className="mx-1.5 h-4 w-px shrink-0 bg-line/50" />
              <ToolbarBtn
                onClick={() => setState(createInitialState)}
                title="레이아웃 초기화"
              >
                <RotateCcw size={12} />
              </ToolbarBtn>
            </div>
          </div>

          {/* 에디터 + 우측 컨텍스트 패널 */}
          <div className="flex flex-1 overflow-hidden">

            {/* 분할 패널 영역 */}
            <div className="flex-1 overflow-hidden">
              <PaneTreeRenderer
                node={state.root}
                notes={MOCK_NOTES}
                activeId={state.activeId}
                totalLeaves={panelCount}
                dragNoteId={dragNoteId}
                onActivate={handleActivate}
                onSplitRight={handleSplitRight}
                onSplitDown={handleSplitDown}
                onClose={handleClose}
                onChangeNote={handleChangeNote}
                onDrop={handleDrop}
              />
            </div>

            {/* ── 우측 컨텍스트 패널 or 접힌 탭 ── */}
            {contextOpen ? (
              /* key=activeNoteId → 노트 변경 시 AI 채팅 초기화 */
              <ContextPanel
                key={activeNoteId}
                activeNote={activeNote}
                allNotes={MOCK_NOTES}
                onCollapse={() => setContextOpen(false)}
              />
            ) : (
              /* 접힌 상태: 얇은 스트립으로 표시 */
              <button
                type="button"
                onClick={() => setContextOpen(true)}
                title="컨텍스트 패널 열기"
                className="flex w-6 shrink-0 flex-col items-center justify-center border-l border-line/50 bg-bg2/30 text-txt3 transition-colors hover:bg-surface2/50 hover:text-txt"
              >
                <ChevronLeft size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </SplitThemeContext.Provider>
  );
}

/* ── 툴바 버튼 ──────────────────────────────────────── */
function ToolbarBtn({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
        danger
          ? "border-transparent text-txt3 hover:border-red-500/30 hover:bg-red-500/[0.07] hover:text-red-500"
          : "border-transparent text-txt3 hover:border-line/60 hover:bg-surface2/50 hover:text-txt"
      )}
    >
      {children}
    </button>
  );
}
