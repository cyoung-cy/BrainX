"use client";

import React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { PaneNode, MockNote } from "./types";
import { DropZone } from "./paneUtils";
import PaneLeafView, { type EditMode } from "./PaneLeafView";

interface Props {
  node: PaneNode;
  notes: MockNote[];
  activeId: string;
  totalLeaves: number;
  dragNoteId: string | null;
  paneMode: Record<string, EditMode>;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onDrop: (paneId: string, zone: DropZone, noteId: string) => void;
  onTitleChange: (noteId: string, newTitle: string) => void;
  onModeChange: (paneId: string, mode: EditMode) => void;
}

export default function PaneTreeRenderer({
  node,
  notes,
  activeId,
  totalLeaves,
  dragNoteId,
  paneMode,
  onActivate,
  onClose,
  onDrop,
  onTitleChange,
  onModeChange,
}: Props) {
  if (node.type === "leaf") {
    const note = notes.find((n) => n.id === node.noteId) ?? notes[0];
    return (
      <PaneLeafView
        node={node}
        note={note}
        isActive={activeId === node.id}
        totalLeaves={totalLeaves}
        dragNoteId={dragNoteId}
        mode={paneMode[node.id] ?? "read"}
        onModeChange={onModeChange}
        onActivate={() => onActivate(node.id)}
        onClose={() => onClose(node.id)}
        onDrop={(zone, noteId) => onDrop(node.id, zone, noteId)}
        onTitleChange={onTitleChange}
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
              onActivate={onActivate}
              onClose={onClose}
              onDrop={onDrop}
              onTitleChange={onTitleChange}
              onModeChange={onModeChange}
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
