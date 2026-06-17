"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { RotateCcw, ChevronLeft } from "lucide-react";
import { cx } from "@/lib/utils";
import { MockFolder, MockNote, PaneNode, PaneTabsState, Tab, NotesWorkspaceSession } from "@/lib/notes/noteTypes";
import type { EditMode, AiActionType } from "./NoteEditor";
import { MOCK_NOTES, MOCK_FOLDERS } from "@/lib/notes/mockNotes";
import {
  uid,
  splitNodeAt,
  closeNode,
  countLeaves,
  findFirstLeafId,
  DropZone,
} from "@/lib/notes/paneUtils";
import { AUTO_THEME } from "./theme";
import { SplitThemeContext } from "./SplitThemeContext";
import PaneTreeRenderer, { type QuickSwitcherTarget } from "./PaneTreeRenderer";
import NotesExplorer from "./NotesExplorer";
import RightSidebar, { type PendingAiRequest } from "./RightSidebar";
import { moveNoteIntoFolder, reorderNoteRelativeTo, moveFolderUnder, reorderFolderRelativeTo } from "@/lib/notes/folderDnd";

export type InitialTab = { kind: "note"; noteId: string } | { kind: "start" };

interface NotesWorkspaceProps {
  initialTab: InitialTab;
  /** 지정 시 localStorage에 세션(분할/탭/노트/폴더)을 영속화한다. 데모(split-demo)는 비워서 매번 초기화. */
  persistKey?: string;
  /** 대표 활성 노트가 바뀔 때 호출 — 페이지에서 URL을 갱신하는 데 사용 */
  onActiveNoteChange?: (noteId: string) => void;
}

/* 패널 트리 + 탭 상태를 함께 초기화 (동일한 paneId로 묶기 위해 한번에 생성) */
function createInitialPaneState(initialTab: InitialTab) {
  const rootId = uid();
  const tabId = uid();
  const tab: Tab =
    initialTab.kind === "note" ? { id: tabId, kind: "note", noteId: initialTab.noteId } : { id: tabId, kind: "start" };
  const leafNoteId = initialTab.kind === "note" ? initialTab.noteId : MOCK_NOTES[0].id;
  return {
    root: { type: "leaf", id: rootId, noteId: leafNoteId } as PaneNode,
    activeId: rootId,
    paneTabs: {
      [rootId]: { tabs: [tab], activeTabId: tabId },
    } as Record<string, PaneTabsState>,
  };
}

function readSession(persistKey: string): NotesWorkspaceSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(persistKey);
    if (!raw) return null;
    return JSON.parse(raw) as NotesWorkspaceSession;
  } catch {
    return null;
  }
}

function writeSession(persistKey: string, session: NotesWorkspaceSession) {
  try {
    window.localStorage.setItem(persistKey, JSON.stringify(session));
  } catch {
    // ignore storage issues
  }
}

export default function NotesWorkspace({ initialTab, persistKey, onActiveNoteChange }: NotesWorkspaceProps) {
  // 최초 1회만 생성되는 초기값 (pane root와 paneTabs가 같은 paneId를 공유해야 함)
  const initRef = useRef<ReturnType<typeof createInitialPaneState> | null>(null);
  if (!initRef.current) initRef.current = createInitialPaneState(initialTab);
  const init = initRef.current;

  const [state, setState] = useState<{ root: PaneNode; activeId: string }>(() => ({
    root: init.root,
    activeId: init.activeId,
  }));
  const [paneTabs, setPaneTabs] = useState<Record<string, PaneTabsState>>(() => init.paneTabs);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  // MOCK_NOTES를 가변 상태로 복사 → 제목 수정/새 노트 생성 시 사이드바/헤더/컨텍스트 패널 즉시 반영
  const [notes, setNotes] = useState<MockNote[]>(() => [...MOCK_NOTES]);
  const [folders, setFolders] = useState<MockFolder[]>(() => [...MOCK_FOLDERS]);
  // 패널별 읽기/편집 모드 — paneId 기준으로 보존 (화면분할 시 기존 패널 모드 유지)
  const [paneMode, setPaneMode] = useState<Record<string, EditMode>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [aiRequest, setAiRequest] = useState<PendingAiRequest | null>(null);
  const [quickSwitcher, setQuickSwitcher] = useState<QuickSwitcherTarget | null>(null);
  const aiNonceRef = useRef(0);
  const hydratedRef = useRef(false);
  const prevActiveNoteIdRef = useRef<string | null>(null);
  const prevInitialKeyRef = useRef<string>(initialTab.kind === "note" ? initialTab.noteId : "start");

  const panelCount = countLeaves(state.root);

  /* 활성 패널의 활성 탭 → 현재 노트 (우측 컨텍스트 패널 기준). start 탭이면 null. */
  const activeTabsState = paneTabs[state.activeId];
  const activeTab = activeTabsState?.tabs.find((t) => t.id === activeTabsState.activeTabId) ?? null;
  const activeNoteId = activeTab?.kind === "note" ? activeTab.noteId : null;
  const activeNote = activeNoteId ? notes.find((n) => n.id === activeNoteId) ?? null : null;

  /* ── 핸들러 ────────────────────────────────────────── */

  /* 사이드바에서 노트 클릭 → 활성 패널에 탭으로 열기 (이미 열려있으면 해당 탭 활성화) */
  const handleNoteClick = useCallback((noteId: string) => {
    const paneId = state.activeId;
    setPaneTabs((prev) => {
      const current = prev[paneId];
      if (!current) {
        const newTabId = uid();
        return { ...prev, [paneId]: { tabs: [{ id: newTabId, kind: "note", noteId }], activeTabId: newTabId } };
      }
      const existing = current.tabs.find((t) => t.kind === "note" && t.noteId === noteId);
      if (existing) {
        return { ...prev, [paneId]: { ...current, activeTabId: existing.id } };
      }
      const newTabId = uid();
      return {
        ...prev,
        [paneId]: { tabs: [...current.tabs, { id: newTabId, kind: "note", noteId }], activeTabId: newTabId },
      };
    });
  }, [state.activeId]);

  /* 패널 닫기 — paneMode / paneTabs 정리 동반 */
  const handleClose = useCallback((id: string) => {
    setState((prev) => {
      const newRoot = closeNode(prev.root, id);
      if (!newRoot) return prev;
      const newActiveId =
        prev.activeId === id ? (findFirstLeafId(newRoot) ?? prev.activeId) : prev.activeId;
      return { root: newRoot, activeId: newActiveId };
    });
    setPaneMode((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setPaneTabs((prev) => {
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

  /* 노트 제목 변경 → notes 상태 갱신 (사이드바/탭/헤더/컨텍스트 즉시 반영) */
  const handleTitleChange = useCallback((noteId: string, newTitle: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, title: newTitle, updatedAt: Date.now() } : n))
    );
  }, []);

  /* 노트 본문 변경(에디터 onUpdate 디바운스) → notes 상태 갱신, 탭 전환 후에도 내용 유지 */
  const handleContentChange = useCallback((noteId: string, newContentHtml: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content: newContentHtml, updatedAt: Date.now() } : n))
    );
  }, []);

  /* D&D drop → 항상 분할, 새 패널에 탭 1개로 초기화 */
  const handleDrop = useCallback((paneId: string, zone: DropZone, noteId: string) => {
    const newLeafId = uid();
    const newTabId = uid();
    const direction: "horizontal" | "vertical" =
      zone === "left" || zone === "right" ? "horizontal" : "vertical";
    const position: "before" | "after" =
      zone === "left" || zone === "top" ? "before" : "after";
    setState((prev) => ({
      root: splitNodeAt(prev.root, paneId, direction, noteId, newLeafId, position),
      activeId: newLeafId,
    }));
    setPaneTabs((prev) => ({
      ...prev,
      [newLeafId]: { tabs: [{ id: newTabId, kind: "note", noteId }], activeTabId: newTabId },
    }));
  }, []);

  /* 탭 활성화 (같은 패널 내 탭 전환) */
  const handleTabActivate = useCallback((paneId: string, tabId: string) => {
    setPaneTabs((prev) => {
      const current = prev[paneId];
      if (!current) return prev;
      return { ...prev, [paneId]: { ...current, activeTabId: tabId } };
    });
  }, []);

  /* 탭 닫기 — 활성 탭을 닫으면 인접 탭으로 이동, 마지막 탭은 닫지 않음 */
  const handleTabClose = useCallback((paneId: string, tabId: string) => {
    setPaneTabs((prev) => {
      const current = prev[paneId];
      if (!current || current.tabs.length <= 1) return prev;
      const idx = current.tabs.findIndex((t) => t.id === tabId);
      const newTabs = current.tabs.filter((t) => t.id !== tabId);
      let newActiveTabId = current.activeTabId;
      if (current.activeTabId === tabId) {
        newActiveTabId = (newTabs[idx] ?? newTabs[idx - 1] ?? newTabs[0]).id;
      }
      return { ...prev, [paneId]: { tabs: newTabs, activeTabId: newActiveTabId } };
    });
  }, []);

  /* 새 노트 생성 (선택된 폴더 또는 지정된 폴더 안에 생성), 지정한 패널의 새 탭으로 연다 */
  const createNote = useCallback((folderId: string | undefined, paneId: string) => {
    const newNoteId = `note-${uid()}`;
    const newTabId = uid();
    const newNote: MockNote = {
      id: newNoteId,
      title: "새 노트",
      content: "",
      tags: [],
      category: "frontend",
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [...prev, newNote]);
    setPaneTabs((prev) => {
      const current = prev[paneId];
      const newTab: Tab = { id: newTabId, kind: "note", noteId: newNoteId };
      const newTabs = current ? [...current.tabs, newTab] : [newTab];
      return { ...prev, [paneId]: { tabs: newTabs, activeTabId: newTabId } };
    });
    setState((prev) => ({ ...prev, activeId: paneId }));
    return newNoteId;
  }, []);

  /* 사이드바 "+ 새 노트" 버튼 → 현재 선택된 폴더 안에, 활성 패널의 새 탭으로 생성 */
  const handleNewNote = useCallback((folderId?: string) => {
    createNote(folderId, state.activeId);
  }, [createNote, state.activeId]);

  /* 탭 바의 "+" 버튼 → 해당 패널에 빈 "새 탭"(start)을 추가 (Obsidian Ctrl+T와 동일) */
  const handleNewTab = useCallback((paneId: string) => {
    const newTabId = uid();
    setPaneTabs((prev) => {
      const current = prev[paneId];
      const newTab: Tab = { id: newTabId, kind: "start" };
      const newTabs = current ? [...current.tabs, newTab] : [newTab];
      return { ...prev, [paneId]: { tabs: newTabs, activeTabId: newTabId } };
    });
    setState((prev) => ({ ...prev, activeId: paneId }));
  }, []);

  /* 특정 탭(보통 start 탭)을 새로 만든 노트로 같은 자리에서 교체 */
  const replaceTabWithNote = useCallback((paneId: string, tabId: string, noteId: string) => {
    setPaneTabs((prev) => {
      const current = prev[paneId];
      if (!current) return prev;
      const newTabs = current.tabs.map((t) =>
        t.id === tabId ? ({ id: tabId, kind: "note", noteId } as Tab) : t
      );
      return { ...prev, [paneId]: { tabs: newTabs, activeTabId: tabId } };
    });
    setState((prev) => ({ ...prev, activeId: paneId }));
  }, []);

  /* "새 파일 생성하기" / Ctrl+N — start 탭이면 그 자리에서 노트로 교체, 아니면 새 탭으로 추가 */
  const requestNewNote = useCallback((paneId: string) => {
    const tabsState = paneTabs[paneId];
    const active = tabsState?.tabs.find((t) => t.id === tabsState.activeTabId);
    if (active?.kind === "start") {
      const newNoteId = `note-${uid()}`;
      const newNote: MockNote = {
        id: newNoteId,
        title: "새 노트",
        content: "",
        tags: [],
        category: "frontend",
        folderId: selectedFolderId ?? undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [...prev, newNote]);
      replaceTabWithNote(paneId, active.id, newNoteId);
    } else {
      createNote(selectedFolderId ?? undefined, paneId);
    }
  }, [paneTabs, selectedFolderId, replaceTabWithNote, createNote]);

  /* "파일로 이동하기" / Ctrl+O */
  const requestQuickSwitcher = useCallback((paneId: string, tabId: string) => {
    setQuickSwitcher({ paneId, tabId });
  }, []);

  const handleQuickSwitcherSelect = useCallback((noteId: string) => {
    if (!quickSwitcher) return;
    const { paneId, tabId } = quickSwitcher;
    const tabsState = paneTabs[paneId];
    const active = tabsState?.tabs.find((t) => t.id === tabId);
    if (active?.kind === "start") {
      replaceTabWithNote(paneId, tabId, noteId);
    } else {
      handleNoteClick(noteId);
    }
    setQuickSwitcher(null);
  }, [quickSwitcher, paneTabs, replaceTabWithNote, handleNoteClick]);

  /* 폴더 생성 — 루트(parentFolderId=null) 또는 특정 폴더 하위에 인라인으로 추가 */
  const handleCreateFolder = useCallback((parentFolderId: string | null, name: string) => {
    const newFolder: MockFolder = { id: `folder-${uid()}`, name, parentFolderId };
    setFolders((prev) => [...prev, newFolder]);
  }, []);

  const handleRenameFolder = useCallback((folderId: string, newName: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f)));
  }, []);

  const handleChangeFolderColor = useCallback((folderId: string, color: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, color } : f)));
  }, []);

  const handleToggleFolderFavorite = useCallback((folderId: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, favorite: !f.favorite } : f))
    );
  }, []);

  /* 폴더 삭제 — 하위 폴더/노트는 삭제된 폴더의 부모로 승격(데이터 손실 방지) */
  const handleDeleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => {
      const target = prev.find((f) => f.id === folderId);
      if (!target) return prev;
      return prev
        .filter((f) => f.id !== folderId)
        .map((f) => (f.parentFolderId === folderId ? { ...f, parentFolderId: target.parentFolderId } : f));
    });
    setNotes((prev) => {
      const target = folders.find((f) => f.id === folderId);
      return prev.map((n) =>
        n.folderId === folderId ? { ...n, folderId: target?.parentFolderId ?? undefined } : n
      );
    });
    setSelectedFolderId((prev) => (prev === folderId ? null : prev));
  }, [folders]);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  /* 노트 탐색기 드래그앤드랍 — 노트를 폴더/루트로 이동, 또는 같은 레벨에서 순서 변경. */
  const handleMoveNoteToFolder = useCallback((noteId: string, targetFolderId: string | null) => {
    setNotes((prev) => moveNoteIntoFolder(prev, noteId, targetFolderId));
  }, []);

  const handleReorderNote = useCallback((noteId: string, referenceNoteId: string, position: "before" | "after") => {
    setNotes((prev) => reorderNoteRelativeTo(prev, noteId, referenceNoteId, position));
  }, []);

  /* 폴더 이동 — 자기 자신/하위 폴더로의 이동은 folderDnd의 canFolderMoveUnder가 차단(null 반환 시 무시) */
  const handleMoveFolderToParent = useCallback((folderId: string, targetParentId: string | null) => {
    setFolders((prev) => moveFolderUnder(prev, folderId, targetParentId) ?? prev);
  }, []);

  const handleReorderFolder = useCallback((folderId: string, referenceFolderId: string, position: "before" | "after") => {
    setFolders((prev) => reorderFolderRelativeTo(prev, folderId, referenceFolderId, position) ?? prev);
  }, []);

  /* 버블 툴바의 AI 버튼(요약/다시쓰기) → 우측 인라인 AI 패널에 mock 요청 전달 */
  const handleAiAction = useCallback((type: AiActionType, text: string) => {
    aiNonceRef.current += 1;
    setAiRequest({ type, text, nonce: aiNonceRef.current });
  }, []);

  const handleReset = useCallback(() => {
    const fresh = createInitialPaneState(initialTab);
    setState({ root: fresh.root, activeId: fresh.activeId });
    setPaneTabs(fresh.paneTabs);
    setPaneMode({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 세션 영속화 (persistKey 지정 시) ──────────────────────────── */

  // mount 시 1회: 저장된 세션 복원 → initialTab이 note면 그 노트를 활성 패널 탭으로 연다
  useEffect(() => {
    if (!persistKey) {
      hydratedRef.current = true;
      return;
    }
    const saved = readSession(persistKey);
    if (saved) {
      // 복원된 세션 위에서, initialTab이 note를 가리키면 그 노트를 활성 패널의 탭으로 연다.
      // (handleNoteClick은 마운트 시점의 stale state를 참조하므로 여기서 saved 값으로 직접 계산한다.)
      let nextPaneTabs = saved.paneTabs;
      const nextActiveId = saved.activeId;
      if (initialTab.kind === "note") {
        const noteId = initialTab.noteId;
        const current = nextPaneTabs[nextActiveId];
        const existing = current?.tabs.find((t) => t.kind === "note" && t.noteId === noteId);
        if (existing) {
          nextPaneTabs = { ...nextPaneTabs, [nextActiveId]: { ...current, activeTabId: existing.id } };
        } else {
          const newTabId = uid();
          const newTab: Tab = { id: newTabId, kind: "note", noteId };
          const newTabs = current ? [...current.tabs, newTab] : [newTab];
          nextPaneTabs = { ...nextPaneTabs, [nextActiveId]: { tabs: newTabs, activeTabId: newTabId } };
        }
      }
      setState({ root: saved.root, activeId: nextActiveId });
      setPaneTabs(nextPaneTabs);
      setNotes(saved.notes);
      setFolders(saved.folders);
    }
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // 마운트 후 initialTab이 바뀌면(클라이언트 라우팅으로 다른 노트로 이동) 해당 노트를 연다
  useEffect(() => {
    const key = initialTab.kind === "note" ? initialTab.noteId : "start";
    if (prevInitialKeyRef.current === key) return;
    prevInitialKeyRef.current = key;
    if (initialTab.kind === "note") handleNoteClick(initialTab.noteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab.kind === "note" ? initialTab.noteId : "start"]);

  // 변경 사항을 디바운스 저장
  useEffect(() => {
    if (!persistKey || !hydratedRef.current) return;
    const handle = window.setTimeout(() => {
      writeSession(persistKey, { root: state.root, activeId: state.activeId, paneTabs, notes, folders });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [persistKey, state, paneTabs, notes, folders]);

  // 대표 활성 노트가 바뀌면 URL 갱신 콜백 호출
  useEffect(() => {
    if (!activeNoteId) return;
    if (prevActiveNoteIdRef.current === activeNoteId) return;
    prevActiveNoteIdRef.current = activeNoteId;
    onActiveNoteChange?.(activeNoteId);
  }, [activeNoteId, onActiveNoteChange]);

  /* ── 키보드 단축키 (Ctrl/Cmd+N 새 파일, Ctrl/Cmd+O 파일로 이동) ── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        requestNewNote(state.activeId);
      } else if (e.key.toLowerCase() === "o") {
        e.preventDefault();
        const tabsState = paneTabs[state.activeId];
        const tabId = tabsState?.activeTabId;
        if (tabId) requestQuickSwitcher(state.activeId, tabId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.activeId, paneTabs, requestNewNote, requestQuickSwitcher]);

  return (
    <SplitThemeContext.Provider value={AUTO_THEME}>
      <div className="flex h-full overflow-hidden">

        {/* ── 좌측: 노트 탐색기 ──────────────────────── */}
        <NotesExplorer
          notes={notes}
          folders={folders}
          activeNoteId={activeNoteId ?? ""}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onNoteClick={handleNoteClick}
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleNewNote}
          onRenameFolder={handleRenameFolder}
          onChangeFolderColor={handleChangeFolderColor}
          onToggleFolderFavorite={handleToggleFolderFavorite}
          onDeleteFolder={handleDeleteFolder}
          onDragStart={(id) => setDragNoteId(id)}
          onDragEnd={() => setDragNoteId(null)}
          onMoveNoteToFolder={handleMoveNoteToFolder}
          onReorderNote={handleReorderNote}
          onMoveFolderToParent={handleMoveFolderToParent}
          onReorderFolder={handleReorderFolder}
        />

        {/* ── 중앙: 에디터 영역 ───────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* 툴바 */}
          <div className="flex shrink-0 items-center gap-3 border-b border-line/50 px-5 py-2">
            <span className="text-[12px] font-medium text-txt2">
              {panelCount}개 패널
            </span>
            <span className="text-[11px] text-txt3/60">
              · 노트 클릭 = 탭으로 열기 · 드래그 = 분할
            </span>
            <div className="flex-1" />
            <button
              onClick={handleReset}
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
                paneTabs={paneTabs}
                quickSwitcher={quickSwitcher}
                onActivate={handleActivate}
                onClose={handleClose}
                onDrop={handleDrop}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onModeChange={handleModeChange}
                onTabActivate={handleTabActivate}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onAiAction={handleAiAction}
                onCreateNoteInTab={(paneId) => requestNewNote(paneId)}
                onOpenQuickSwitcher={(paneId, tabId) => requestQuickSwitcher(paneId, tabId)}
                onQuickSwitcherSelect={handleQuickSwitcherSelect}
                onQuickSwitcherClose={() => setQuickSwitcher(null)}
              />
            </div>

            {contextOpen ? (
              <RightSidebar
                key={activeNoteId ?? "start"}
                activeNote={activeNote}
                allNotes={notes}
                onCollapse={() => setContextOpen(false)}
                pendingAiRequest={aiRequest}
                onAiRequestHandled={() => setAiRequest(null)}
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
