"use client";

import React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { PaneNode, MockNote } from "./types";
import { DropZone } from "./paneUtils";
import PaneLeafView from "./PaneLeafView";

interface Props {
  node: PaneNode;
  notes: MockNote[];
  activeId: string;
  totalLeaves: number;
  dragNoteId: string | null;
  onActivate: (id: string) => void;
  onSplitRight: (id: string) => void;
  onSplitDown: (id: string) => void;
  onClose: (id: string) => void;
  onChangeNote: (paneId: string, noteId: string) => void;
  onDrop: (paneId: string, zone: DropZone, noteId: string) => void;
}

export default function PaneTreeRenderer({
  node,
  notes,
  activeId,
  totalLeaves,
  dragNoteId,
  onActivate,
  onSplitRight,
  onSplitDown,
  onClose,
  onChangeNote,
  onDrop,
}: Props) {
  if (node.type === "leaf") {
    const note = notes.find((n) => n.id === node.noteId) ?? notes[0];
    return (
      <PaneLeafView
        node={node}
        note={note}
        isActive={activeId === node.id}
        totalLeaves={totalLeaves}
        allNotes={notes}
        dragNoteId={dragNoteId}
        onActivate={() => onActivate(node.id)}
        onSplitRight={() => onSplitRight(node.id)}
        onSplitDown={() => onSplitDown(node.id)}
        onClose={() => onClose(node.id)}
        onChangeNote={(noteId) => onChangeNote(node.id, noteId)}
        onDrop={(zone, noteId) => onDrop(node.id, zone, noteId)}
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
              onActivate={onActivate}
              onSplitRight={onSplitRight}
              onSplitDown={onSplitDown}
              onClose={onClose}
              onChangeNote={onChangeNote}
              onDrop={onDrop}
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
