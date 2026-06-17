"use client";

import React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { PaneNode, MockNote, PaneTabsState, Tab } from "@/lib/notes/noteTypes";
import { DropZone } from "@/lib/notes/paneUtils";
import EditorPanel from "./EditorPanel";
import type { EditMode, AiActionType } from "./NoteEditor";

export interface QuickSwitcherTarget {
  paneId: string;
  tabId: string;
}

interface Props {
  node: PaneNode;
  notes: MockNote[];
  activeId: string;
  totalLeaves: number;
  dragNoteId: string | null;
  paneMode: Record<string, EditMode>;
  paneTabs: Record<string, PaneTabsState>;
  quickSwitcher: QuickSwitcherTarget | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onDrop: (paneId: string, zone: DropZone, noteId: string) => void;
  onTitleChange: (noteId: string, newTitle: string) => void;
  onContentChange: (noteId: string, newContentHtml: string) => void;
  onModeChange: (paneId: string, mode: EditMode) => void;
  onTabActivate: (paneId: string, tabId: string) => void;
  onTabClose: (paneId: string, tabId: string) => void;
  onNewTab: (paneId: string) => void;
  onAiAction: (type: AiActionType, text: string) => void;
  onCreateNoteInTab: (paneId: string, tabId: string) => void;
  onOpenQuickSwitcher: (paneId: string, tabId: string) => void;
  onQuickSwitcherSelect: (noteId: string) => void;
  onQuickSwitcherClose: () => void;
}

export default function PaneTreeRenderer({
  node,
  notes,
  activeId,
  totalLeaves,
  dragNoteId,
  paneMode,
  paneTabs,
  quickSwitcher,
  onActivate,
  onClose,
  onDrop,
  onTitleChange,
  onContentChange,
  onModeChange,
  onTabActivate,
  onTabClose,
  onNewTab,
  onAiAction,
  onCreateNoteInTab,
  onOpenQuickSwitcher,
  onQuickSwitcherSelect,
  onQuickSwitcherClose,
}: Props) {
  if (node.type === "leaf") {
    const tabsState = paneTabs[node.id];
    const activeTabId = tabsState?.activeTabId ?? "";
    const fallbackTab: Tab = { id: activeTabId, kind: "note", noteId: node.noteId };
    const activeTab: Tab = tabsState?.tabs.find((t) => t.id === activeTabId) ?? fallbackTab;
    const note = activeTab.kind === "note" ? notes.find((n) => n.id === activeTab.noteId) ?? notes[0] : null;
    const tabs = tabsState?.tabs ?? [fallbackTab];

    return (
      <EditorPanel
        node={node}
        activeTab={activeTab}
        note={note}
        allNotes={notes}
        tabs={tabs}
        activeTabId={activeTabId}
        isActive={activeId === node.id}
        totalLeaves={totalLeaves}
        dragNoteId={dragNoteId}
        mode={paneMode[node.id] ?? "read"}
        onModeChange={onModeChange}
        onActivate={() => onActivate(node.id)}
        onClose={() => onClose(node.id)}
        onDrop={(zone, noteId) => onDrop(node.id, zone, noteId)}
        onTitleChange={onTitleChange}
        onContentChange={onContentChange}
        onTabActivate={(tabId) => onTabActivate(node.id, tabId)}
        onTabClose={(tabId) => onTabClose(node.id, tabId)}
        onNewTab={() => onNewTab(node.id)}
        onAiAction={onAiAction}
        onCreateNoteInTab={() => onCreateNoteInTab(node.id, activeTab.id)}
        onOpenQuickSwitcher={() => onOpenQuickSwitcher(node.id, activeTab.id)}
        quickSwitcherOpen={quickSwitcher?.paneId === node.id && quickSwitcher?.tabId === activeTabId}
        onQuickSwitcherSelect={onQuickSwitcherSelect}
        onQuickSwitcherClose={onQuickSwitcherClose}
      />
    );
  }

  const defaultSize = 100 / node.children.length;

  return (
    <Group orientation={node.direction} style={{ height: "100%", width: "100%" }}>
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          <Panel defaultSize={defaultSize} minSize="8%" style={{ overflow: "hidden" }}>
            <PaneTreeRenderer
              node={child}
              notes={notes}
              activeId={activeId}
              totalLeaves={totalLeaves}
              dragNoteId={dragNoteId}
              paneMode={paneMode}
              paneTabs={paneTabs}
              quickSwitcher={quickSwitcher}
              onActivate={onActivate}
              onClose={onClose}
              onDrop={onDrop}
              onTitleChange={onTitleChange}
              onContentChange={onContentChange}
              onModeChange={onModeChange}
              onTabActivate={onTabActivate}
              onTabClose={onTabClose}
              onNewTab={onNewTab}
              onAiAction={onAiAction}
              onCreateNoteInTab={onCreateNoteInTab}
              onOpenQuickSwitcher={onOpenQuickSwitcher}
              onQuickSwitcherSelect={onQuickSwitcherSelect}
              onQuickSwitcherClose={onQuickSwitcherClose}
            />
          </Panel>

          {index < node.children.length - 1 && (
            <Separator
              style={{
                width:  node.direction === "horizontal" ? 4 : "100%",
                height: node.direction === "vertical"   ? 4 : "100%",
                background: "rgb(var(--line) / 0.35)",
                cursor: node.direction === "horizontal" ? "col-resize" : "row-resize",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(var(--primary) / 0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(var(--line) / 0.35)";
              }}
            />
          )}
        </React.Fragment>
      ))}
    </Group>
  );
}
