"use client";

import { useState, useCallback } from "react";
import { RotateCcw, ChevronLeft } from "lucide-react";
import { cx } from "@/lib/utils";
import { PaneNode } from "./types";
import type { EditMode } from "./PaneLeafView";
import { MOCK_NOTES } from "./mockData";
import {
  uid,
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
  // MOCK_NOTES를 가변 상태로 복사 → 제목 수정 시 사이드바/헤더/컨텍스트 패널 즉시 반영
  const [notes, setNotes] = useState(() => [...MOCK_NOTES]);
  // 패널별 읽기/편집 모드 — paneId 기준으로 보존 (화면분할 시 기존 패널 모드 유지)
  const [paneMode, setPaneMode] = useState<Record<string, EditMode>>({});

  const panelCount = countLeaves(state.root);
  const activeNoteId = findLeafNoteId(state.root, state.activeId) ?? notes[0].id;
  const activeNote = notes.find((n) => n.id === activeNoteId) ?? notes[0];

  /* ── 핸들러 ────────────────────────────────────────── */

  /* 노트 클릭 → 현재 활성 패널 교체 */
  const handleNoteClick = useCallback((noteId: string) => {
    setState((prev) => ({
      ...prev,
      root: setNoteOnLeaf(prev.root, prev.activeId, noteId),
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
    // 닫힌 paneId의 mode 상태 제거 (paneMode와 layout 불일치 방지)
    setPaneMode((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleActivate = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  }, []);

  /* 패널 모드 변경 — paneId 기준으로 저장 */
  const handleModeChange = useCallback((paneId: string, mode: EditMode) => {
    setPaneMode((prev) => ({ ...prev, [paneId]: mode }));
  }, []);

  /* 노트 제목 변경 → notes 상태 갱신 (사이드바/헤더/컨텍스트 즉시 반영) */
  const handleTitleChange = useCallback((noteId: string, newTitle: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, title: newTitle } : n))
    );
  }, []);

  /* D&D drop → 항상 분할 */
  const handleDrop = useCallback((paneId: string, zone: DropZone, noteId: string) => {
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
      <div className="flex h-full overflow-hidden">

        {/* ── 좌측: 노트 탐색기 ──────────────────────── */}
        <NoteSidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onNoteClick={handleNoteClick}
          onDragStart={(id) => setDragNoteId(id)}
          onDragEnd={() => setDragNoteId(null)}
        />

        {/* ── 중앙: 에디터 영역 ───────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* 툴바 */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line/50 px-5 py-2">
            <span className="text-[12px] font-medium text-txt2">
              {panelCount}개 패널
            </span>
            <span className="text-[11px] text-txt3/60">
              · 노트 클릭 = 교체 · 드래그 = 분할
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setState(createInitialState)}
              title="레이아웃 초기화"
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                "border-transparent text-txt3 hover:border-line/60 hover:bg-surface2/50 hover:text-txt"
              )}
            >
              <RotateCcw size={12} />
              <span>초기화</span>
            </button>
          </div>

          {/* 에디터 + 우측 컨텍스트 패널 */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <PaneTreeRenderer
                node={state.root}
                notes={notes}
                activeId={state.activeId}
                totalLeaves={panelCount}
                dragNoteId={dragNoteId}
                paneMode={paneMode}
                onActivate={handleActivate}
                onClose={handleClose}
                onDrop={handleDrop}
                onTitleChange={handleTitleChange}
                onModeChange={handleModeChange}
              />
            </div>

            {contextOpen ? (
              <ContextPanel
                key={activeNoteId}
                activeNote={activeNote}
                allNotes={MOCK_NOTES}
                onCollapse={() => setContextOpen(false)}
              />
            ) : (
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
