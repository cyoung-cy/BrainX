"use client";

import React, { useState, useCallback } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cx } from "@/lib/utils";
import { MOCK_NOTES, type NoteData } from "./mockData";
import EditorPanel from "./EditorPanel";

/* ── Pane tree types ──────────────────────────── */
export interface PaneLeaf {
  type: "leaf";
  id: string;
  noteId: string;
}

export interface PaneSplit {
  type: "split";
  id: string;
  direction: "horizontal" | "vertical";
  children: PaneNode[];
}

export type PaneNode = PaneLeaf | PaneSplit;

/* ── Utilities ────────────────────────────────── */
let _uid = 0;
function uid() { return `pane-${++_uid}`; }

function countLeaves(node: PaneNode): number {
  if (node.type === "leaf") return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function splitNode(root: PaneNode, targetId: string, dir: "horizontal" | "vertical", newNoteId: string): PaneNode {
  if (root.type === "leaf") {
    if (root.id !== targetId) return root;
    const newLeaf: PaneLeaf = { type: "leaf", id: uid(), noteId: newNoteId };
    return { type: "split", id: uid(), direction: dir, children: [root, newLeaf] };
  }
  return { ...root, children: root.children.map((c) => splitNode(c, targetId, dir, newNoteId)) };
}

function closeNode(root: PaneNode, targetId: string): PaneNode | null {
  if (root.type === "leaf") return root.id === targetId ? null : root;
  const children = root.children.map((c) => closeNode(c, targetId)).filter(Boolean) as PaneNode[];
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...root, children };
}

function setNoteOnLeaf(root: PaneNode, leafId: string, noteId: string): PaneNode {
  if (root.type === "leaf") {
    return root.id === leafId ? { ...root, noteId } : root;
  }
  return { ...root, children: root.children.map((c) => setNoteOnLeaf(c, leafId, noteId)) };
}

function findFirstLeafId(node: PaneNode): string {
  if (node.type === "leaf") return node.id;
  return findFirstLeafId(node.children[0]);
}

/* ── State ────────────────────────────────────── */
interface WorkspaceState {
  root: PaneNode;
  activeId: string;
}

interface Props {
  isLight: boolean;
  initialNoteId?: string;
}

export default function SplitWorkspace({ isLight, initialNoteId }: Props) {
  const firstNote = initialNoteId ?? MOCK_NOTES[0].id;
  const [state, setState] = useState<WorkspaceState>(() => {
    const leaf: PaneLeaf = { type: "leaf", id: uid(), noteId: firstNote };
    return { root: leaf, activeId: leaf.id };
  });
  const [maximizedId, setMaximizedId] = useState<string | null>(null);

  const totalLeaves = countLeaves(state.root);

  function getNextNoteId(excludeId?: string) {
    const pool = excludeId ? MOCK_NOTES.filter((n) => n.id !== excludeId) : MOCK_NOTES;
    return pool[0].id;
  }

  const handleSplitRight = useCallback((leafId: string) => {
    const currentNoteId = getNoteIdFromLeaf(state.root, leafId);
    const newNoteId = getNextNoteId(currentNoteId ?? undefined);
    setState((s) => {
      const newRoot = splitNode(s.root, leafId, "horizontal", newNoteId);
      return { ...s, root: newRoot };
    });
  }, [state.root]);

  const handleSplitDown = useCallback((leafId: string) => {
    const currentNoteId = getNoteIdFromLeaf(state.root, leafId);
    const newNoteId = getNextNoteId(currentNoteId ?? undefined);
    setState((s) => {
      const newRoot = splitNode(s.root, leafId, "vertical", newNoteId);
      return { ...s, root: newRoot };
    });
  }, [state.root]);

  const handleClose = useCallback((leafId: string) => {
    setState((s) => {
      const newRoot = closeNode(s.root, leafId);
      if (!newRoot) return s;
      const newActiveId = s.activeId === leafId ? findFirstLeafId(newRoot) : s.activeId;
      return { root: newRoot, activeId: newActiveId };
    });
  }, []);

  const handleChangeNote = useCallback((leafId: string, noteId: string) => {
    setState((s) => ({ ...s, root: setNoteOnLeaf(s.root, leafId, noteId) }));
  }, []);

  const handleActivate = useCallback((leafId: string) => {
    setState((s) => ({ ...s, activeId: leafId }));
  }, []);

  /* Maximized view */
  if (maximizedId) {
    const noteId = getNoteIdFromLeaf(state.root, maximizedId) ?? firstNote;
    const note = MOCK_NOTES.find((n) => n.id === noteId) ?? MOCK_NOTES[0];
    return (
      <div className="flex h-full flex-col">
        <div className={cx(
          "flex items-center gap-2 px-3 py-1.5 border-b text-[11px]",
          isLight ? "border-slate-200 bg-slate-50" : "border-line/50"
        )}>
          <span className={isLight ? "text-slate-500" : "text-txt3"}>최대화 모드</span>
          <button
            onClick={() => setMaximizedId(null)}
            className={cx("ml-auto px-2 py-1 rounded text-[11px] border", isLight ? "border-slate-200 text-slate-500 hover:bg-slate-100" : "border-line/40 text-txt2 hover:bg-surface2")}
          >
            원래대로
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <EditorPanel
            note={note}
            allNotes={MOCK_NOTES}
            isLight={isLight}
            isActive={true}
            totalPanes={1}
            canClose={false}
            onActivate={() => {}}
            onSplitRight={() => {}}
            onSplitDown={() => {}}
            onClose={() => setMaximizedId(null)}
            onChangeNote={(noteId) => handleChangeNote(maximizedId, noteId)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <PaneTreeRenderer
        node={state.root}
        notes={MOCK_NOTES}
        activeId={state.activeId}
        totalLeaves={totalLeaves}
        isLight={isLight}
        onActivate={handleActivate}
        onSplitRight={handleSplitRight}
        onSplitDown={handleSplitDown}
        onClose={handleClose}
        onChangeNote={handleChangeNote}
        onMaximize={(leafId) => setMaximizedId(leafId)}
      />
    </div>
  );
}

/* ── Pane tree renderer ───────────────────────── */
interface RendererProps {
  node: PaneNode;
  notes: NoteData[];
  activeId: string;
  totalLeaves: number;
  isLight: boolean;
  onActivate: (id: string) => void;
  onSplitRight: (id: string) => void;
  onSplitDown: (id: string) => void;
  onClose: (id: string) => void;
  onChangeNote: (paneId: string, noteId: string) => void;
  onMaximize: (id: string) => void;
}

function PaneTreeRenderer({
  node, notes, activeId, totalLeaves, isLight,
  onActivate, onSplitRight, onSplitDown, onClose, onChangeNote, onMaximize,
}: RendererProps) {
  if (node.type === "leaf") {
    const note = notes.find((n) => n.id === node.noteId) ?? notes[0];
    return (
      <EditorPanel
        note={note}
        allNotes={notes}
        isLight={isLight}
        isActive={activeId === node.id}
        totalPanes={totalLeaves}
        canClose={totalLeaves > 1}
        onActivate={() => onActivate(node.id)}
        onSplitRight={() => onSplitRight(node.id)}
        onSplitDown={() => onSplitDown(node.id)}
        onClose={() => onClose(node.id)}
        onChangeNote={(noteId) => onChangeNote(node.id, noteId)}
        onMaximize={() => onMaximize(node.id)}
      />
    );
  }

  const defaultSize = 100 / node.children.length;

  return (
    <Group orientation={node.direction} style={{ height: "100%", width: "100%" }}>
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          <Panel defaultSize={defaultSize} minSize={15} style={{ overflow: "hidden" }}>
            <PaneTreeRenderer
              node={child} notes={notes} activeId={activeId} totalLeaves={totalLeaves}
              isLight={isLight} onActivate={onActivate} onSplitRight={onSplitRight}
              onSplitDown={onSplitDown} onClose={onClose} onChangeNote={onChangeNote}
              onMaximize={onMaximize}
            />
          </Panel>
          {index < node.children.length - 1 && (
            <Separator
              style={{
                width: node.direction === "horizontal" ? 4 : "100%",
                height: node.direction === "vertical" ? 4 : "100%",
                background: "rgb(var(--border) / 0.3)",
                cursor: node.direction === "horizontal" ? "col-resize" : "row-resize",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgb(var(--primary) / 0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgb(var(--border) / 0.3)"; }}
            />
          )}
        </React.Fragment>
      ))}
    </Group>
  );
}

/* ── Helpers ──────────────────────────────────── */
function getNoteIdFromLeaf(node: PaneNode, leafId: string): string | null {
  if (node.type === "leaf") return node.id === leafId ? node.noteId : null;
  for (const child of node.children) {
    const result = getNoteIdFromLeaf(child, leafId);
    if (result) return result;
  }
  return null;
}
