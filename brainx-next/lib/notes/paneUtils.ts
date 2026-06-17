import { PaneLeaf, PaneNode, PaneSplit } from "./noteTypes";

/** DnD 드롭 위치 — 패널을 4방향으로 구분 (분할 전용) */
export type DropZone = "left" | "right" | "top" | "bottom";

let _counter = 0;
export function uid(): string {
  return `p${++_counter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function countLeaves(node: PaneNode): number {
  if (node.type === "leaf") return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

export function getMaxDepth(node: PaneNode): number {
  if (node.type === "leaf") return 0;
  return 1 + Math.max(...node.children.map(getMaxDepth));
}

/**
 * 특정 leaf를 찾아서 [기존 leaf, 새 leaf]를 포함하는 split 노드로 교체.
 * newLeafId는 호출자가 미리 생성해 전달 → 새 패널 ID를 활성화에 활용 가능.
 */
export function splitNode(
  root: PaneNode,
  targetId: string,
  direction: "horizontal" | "vertical",
  newNoteId: string,
  newLeafId: string
): PaneNode {
  if (root.type === "leaf") {
    if (root.id !== targetId) return root;
    const newLeaf: PaneLeaf = { type: "leaf", id: newLeafId, noteId: newNoteId };
    const split: PaneSplit = { type: "split", id: uid(), direction, children: [root, newLeaf] };
    return split;
  }
  return { ...root, children: root.children.map((c) => splitNode(c, targetId, direction, newNoteId, newLeafId)) };
}

/** 특정 leaf를 트리에서 제거. 형제가 1개만 남으면 split 노드를 해당 자식으로 대체. */
export function closeNode(root: PaneNode, targetId: string): PaneNode | null {
  if (root.type === "leaf") return root.id === targetId ? null : root;
  const survivors = root.children
    .map((c) => closeNode(c, targetId))
    .filter((c): c is PaneNode => c !== null);
  if (survivors.length === 0) return null;
  if (survivors.length === 1) return survivors[0];
  return { ...root, children: survivors };
}

export function setNoteOnLeaf(root: PaneNode, targetId: string, noteId: string): PaneNode {
  if (root.type === "leaf") return root.id === targetId ? { ...root, noteId } : root;
  return { ...root, children: root.children.map((c) => setNoteOnLeaf(c, targetId, noteId)) };
}

export function findFirstLeafId(node: PaneNode): string | null {
  if (node.type === "leaf") return node.id;
  for (const child of node.children) {
    const id = findFirstLeafId(child);
    if (id) return id;
  }
  return null;
}

export function findLeafNoteId(node: PaneNode, leafId: string): string | null {
  if (node.type === "leaf") return node.id === leafId ? node.noteId : null;
  for (const child of node.children) {
    const r = findLeafNoteId(child, leafId);
    if (r) return r;
  }
  return null;
}

/**
 * splitNode의 위치 지정 버전.
 * position "after"  → [기존, 새] (오른쪽/아래 분할)
 * position "before" → [새, 기존] (왼쪽/위 분할)
 */
export function splitNodeAt(
  root: PaneNode,
  targetId: string,
  direction: "horizontal" | "vertical",
  newNoteId: string,
  newLeafId: string,
  position: "before" | "after"
): PaneNode {
  if (root.type === "leaf") {
    if (root.id !== targetId) return root;
    const newLeaf: PaneLeaf = { type: "leaf", id: newLeafId, noteId: newNoteId };
    const children: PaneNode[] = position === "after" ? [root, newLeaf] : [newLeaf, root];
    const split: PaneSplit = { type: "split", id: uid(), direction, children };
    return split;
  }
  return {
    ...root,
    children: root.children.map((c) =>
      splitNodeAt(c, targetId, direction, newNoteId, newLeafId, position)
    ),
  };
}

/** 트리 구조를 compact 문자열로 표현 (디버그용) */
export function serializeTree(node: PaneNode): string {
  if (node.type === "leaf") return `[${node.noteId.slice(0, 5)}]`;
  const sep = node.direction === "horizontal" ? " | " : " / ";
  return `(${node.children.map(serializeTree).join(sep)})`;
}
