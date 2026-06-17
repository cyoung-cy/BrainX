"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cx } from "@/lib/utils";
import { PaneLeaf, MockNote, Tab } from "@/lib/notes/noteTypes";
import { DropZone } from "@/lib/notes/paneUtils";
import TabBar from "./TabBar";
import NoteEditor, { type EditMode, type AiActionType, type NoteEditorHandle } from "./NoteEditor";
import EmptyNoteStartPage from "./EmptyNoteStartPage";
import QuickSwitcher from "./QuickSwitcher";

interface Props {
  node: PaneLeaf;
  activeTab: Tab;
  note: MockNote | null;
  allNotes: MockNote[];
  tabs: Tab[];
  activeTabId: string;
  isActive: boolean;
  totalLeaves: number;
  dragNoteId: string | null;
  mode: EditMode;
  onModeChange: (paneId: string, mode: EditMode) => void;
  onActivate: () => void;
  onClose: () => void;
  onDrop: (zone: DropZone, noteId: string) => void;
  onTitleChange: (noteId: string, newTitle: string) => void;
  onContentChange: (noteId: string, newContentHtml: string) => void;
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onAiAction: (type: AiActionType, text: string) => void;
  onCreateNoteInTab: () => void;
  onOpenQuickSwitcher: () => void;
  quickSwitcherOpen: boolean;
  onQuickSwitcherSelect: (noteId: string) => void;
  onQuickSwitcherClose: () => void;
}

export default function EditorPanel({
  node,
  activeTab,
  note,
  allNotes,
  tabs,
  activeTabId,
  isActive,
  totalLeaves,
  dragNoteId,
  mode,
  onModeChange,
  onActivate,
  onClose,
  onDrop,
  onTitleChange,
  onContentChange,
  onTabActivate,
  onTabClose,
  onNewTab,
  onAiAction,
  onCreateNoteInTab,
  onOpenQuickSwitcher,
  quickSwitcherOpen,
  onQuickSwitcherSelect,
  onQuickSwitcherClose,
}: Props) {
  const [hoverZone, setHoverZone] = useState<DropZone | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NoteEditorHandle>(null);

  /* ── 제목 편집 상태 ── */
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note?.title ?? "");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // note 교체 시 초기화
  useEffect(() => {
    setTitleDraft(note?.title ?? "");
    setIsEditingTitle(false);
  }, [note?.id, note?.title]);

  // 제목 입력창 포커스
  useEffect(() => {
    if (isEditingTitle) {
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      });
    }
  }, [isEditingTitle]);

  const commitTitle = useCallback((focusBody = false) => {
    if (!note) return;
    const t = titleDraft.trim();
    if (t && t !== note.title) onTitleChange(note.id, t);
    setTitleDraft(t || note.title);
    setIsEditingTitle(false);
    if (focusBody) {
      // 제목 input이 사라지는 렌더 이후에 포커스해야 실제로 적용됨.
      requestAnimationFrame(() => {
        editorRef.current?.focusStart();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleDraft, note?.title, note?.id, onTitleChange]);

  const cancelTitle = useCallback(() => {
    setTitleDraft(note?.title ?? "");
    setIsEditingTitle(false);
  }, [note?.title]);

  function getZone(e: React.DragEvent<HTMLDivElement>): DropZone {
    const el = overlayRef.current;
    if (!el) return "right";
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const dx = Math.abs(x - 0.5);
    const dy = Math.abs(y - 0.5);
    if (dx > dy) return x < 0.5 ? "left" : "right";
    return y < 0.5 ? "top" : "bottom";
  }

  const isEdit = mode === "edit";

  return (
    <div
      onClick={onActivate}
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        borderTop: `2px solid ${isActive ? "rgb(var(--primary))" : "transparent"}`,
        transition: "border-color 0.15s",
      }}
    >
      {/* ── 탭 바 (탭 목록 + 모드 토글 + 패널 닫기) */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        notes={allNotes}
        mode={mode}
        showModeToggle={activeTab.kind === "note"}
        showCloseButton={totalLeaves > 1}
        onTabActivate={(tabId) => { onActivate(); onTabActivate(tabId); }}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
        onModeToggle={() => {
          if (isEdit && isEditingTitle) commitTitle();
          onModeChange(node.id, isEdit ? "read" : "edit");
        }}
        onClosePanel={onClose}
      />

      {/* ── 콘텐츠 */}
      {activeTab.kind === "start" || !note ? (
        <EmptyNoteStartPage
          onCreateNote={onCreateNoteInTab}
          onGoToFile={onOpenQuickSwitcher}
          onCloseTab={() => onTabClose(activeTab.id)}
        />
      ) : (
        <div
          className="scroll flex-1 overflow-y-auto"
          style={{ background: "rgb(var(--surface))" }}
        >
          <div className="px-8 py-7">
            {/* 노트 제목: 편집 모드에서는 클릭 → 인라인 input */}
            {isEdit && isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => commitTitle()}
                onKeyDown={(e) => {
                  // IME(한글 등) 조합 중 Enter는 조합 확정용이므로 제목 커밋을 건너뜀
                  if (e.nativeEvent.isComposing || e.key === "Process") return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle(true);
                  }
                  if (e.key === "Escape") { cancelTitle(); }
                }}
                onClick={(e) => e.stopPropagation()}
                className="mb-1.5 w-full bg-transparent text-[22px] font-bold leading-tight tracking-tight text-txt outline-none"
                placeholder="제목 입력..."
              />
            ) : (
              <h1
                className={cx(
                  "mb-1.5 text-[22px] font-bold leading-tight tracking-tight text-txt",
                  isEdit && "cursor-text hover:text-primary/90 transition-colors"
                )}
                onClick={(e) => {
                  if (!isEdit) return;
                  e.stopPropagation();
                  setTitleDraft(note.title);
                  setIsEditingTitle(true);
                }}
                title={isEdit ? "클릭하여 제목 편집" : undefined}
              >
                {note.title}
              </h1>
            )}

            {note.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line/60 px-2.5 py-0.5 text-[11px] font-medium text-txt3"
                    style={{ background: "rgb(var(--surface2) / 0.6)" }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <NoteEditor
              ref={editorRef}
              paneId={node.id}
              note={note}
              mode={mode}
              onModeChange={onModeChange}
              onContentChange={onContentChange}
              onAiAction={onAiAction}
            />

            {isEdit && (
              <p className="mt-4 text-[11px] text-txt3" style={{ opacity: 0.45 }}>
                # 제목 · - 목록 · &gt; 인용 · **굵게** · `코드` · ``` 코드블록 · 텍스트 선택 → 버블 툴바
              </p>
            )}
          </div>
        </div>
      )}

      {quickSwitcherOpen && (
        <QuickSwitcher
          notes={allNotes}
          onSelect={onQuickSwitcherSelect}
          onClose={onQuickSwitcherClose}
        />
      )}

      {/* ── DnD 오버레이 */}
      {dragNoteId !== null && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10"
          style={{ top: 36 }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            const z = getZone(e);
            if (z !== hoverZone) setHoverZone(z);
          }}
          onDragLeave={() => setHoverZone(null)}
          onDrop={(e) => {
            e.preventDefault();
            const noteId = e.dataTransfer.getData("text/plain");
            const zone = getZone(e);
            setHoverZone(null);
            if (noteId) onDrop(zone, noteId);
          }}
        >
          {hoverZone && <SplitPreviewOverlay zone={hoverZone} />}
        </div>
      )}
    </div>
  );
}

/* ── 분할 미리보기 오버레이 */
const SPLIT_LABEL: Record<DropZone, string> = {
  left: "왼쪽에 새 패널 생성",
  right: "오른쪽에 새 패널 생성",
  top: "위에 새 패널 생성",
  bottom: "아래에 새 패널 생성",
};

const SPLIT_POS: Record<DropZone, React.CSSProperties> = {
  left:   { top: 0, left: 0, width: "50%", height: "100%" },
  right:  { top: 0, right: 0, width: "50%", height: "100%" },
  top:    { top: 0, left: 0, right: 0, height: "50%" },
  bottom: { bottom: 0, left: 0, right: 0, height: "50%" },
};

const SPLIT_DIVIDER: Record<DropZone, React.CSSProperties> = {
  left:   { position: "absolute", top: 0, right: -1, width: 2, height: "100%", background: "rgb(var(--primary))" },
  right:  { position: "absolute", top: 0, left: -1,  width: 2, height: "100%", background: "rgb(var(--primary))" },
  top:    { position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "rgb(var(--primary))" },
  bottom: { position: "absolute", top: -1,    left: 0, right: 0, height: 2, background: "rgb(var(--primary))" },
};

function SplitPreviewOverlay({ zone }: { zone: DropZone }) {
  return (
    <div
      style={{
        position: "absolute",
        background: "rgb(var(--primary) / 0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        transition: "all 0.08s ease",
        ...SPLIT_POS[zone],
      }}
    >
      <div style={SPLIT_DIVIDER[zone]} />
      <div
        style={{
          position: "relative",
          background: "rgb(var(--surface))",
          border: "1.5px solid rgb(var(--primary) / 0.45)",
          borderRadius: 8,
          padding: "5px 14px",
          fontSize: 11,
          fontWeight: 600,
          color: "rgb(var(--primary))",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-sans)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          letterSpacing: "0.01em",
        }}
      >
        {SPLIT_LABEL[zone]}
      </div>
    </div>
  );
}
