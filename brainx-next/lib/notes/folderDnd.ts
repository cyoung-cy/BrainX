import { MockFolder, MockNote } from "./noteTypes";

export type DropPosition = "before" | "after" | "into";

/** folderId의 모든 하위(자손) 폴더 id 집합 (재귀) */
export function getDescendantFolderIds(folders: MockFolder[], folderId: string): Set<string> {
  const result = new Set<string>();
  const stack = [folderId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const f of folders) {
      if (f.parentFolderId === current && !result.has(f.id)) {
        result.add(f.id);
        stack.push(f.id);
      }
    }
  }
  return result;
}

/**
 * folderId를 targetParentId 아래로 옮기는 것이 허용되는지 검사.
 * 자기 자신 또는 자기 하위 폴더 안으로 이동하는 것은 금지.
 */
export function canFolderMoveUnder(
  folders: MockFolder[],
  folderId: string,
  targetParentId: string | null
): boolean {
  if (targetParentId === null) return true;
  if (targetParentId === folderId) return false;
  return !getDescendantFolderIds(folders, folderId).has(targetParentId);
}

/** 노트를 폴더 안(끝)으로 이동 — 폴더가 비어 있으면 첫 자식, 있으면 마지막 자식 뒤에 삽입 */
export function moveNoteIntoFolder(
  notes: MockNote[],
  noteId: string,
  targetFolderId: string | null
): MockNote[] {
  const dragged = notes.find((n) => n.id === noteId);
  if (!dragged) return notes;
  const without = notes.filter((n) => n.id !== noteId);
  const updated: MockNote = { ...dragged, folderId: targetFolderId ?? undefined };

  let lastIdx = -1;
  for (let i = 0; i < without.length; i++) {
    if ((without[i].folderId ?? null) === targetFolderId) lastIdx = i;
  }
  const insertAt = lastIdx === -1 ? without.length : lastIdx + 1;
  return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
}

/** 노트를 같은 레벨의 다른 노트 기준으로 앞/뒤에 재배치 (형제의 폴더를 따라감) */
export function reorderNoteRelativeTo(
  notes: MockNote[],
  noteId: string,
  referenceNoteId: string,
  position: "before" | "after"
): MockNote[] {
  if (noteId === referenceNoteId) return notes;
  const dragged = notes.find((n) => n.id === noteId);
  if (!dragged) return notes;
  const without = notes.filter((n) => n.id !== noteId);
  const refIdx = without.findIndex((n) => n.id === referenceNoteId);
  if (refIdx === -1) return notes;
  const ref = without[refIdx];
  const updated: MockNote = { ...dragged, folderId: ref.folderId };
  const insertAt = position === "before" ? refIdx : refIdx + 1;
  return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
}

/** 폴더를 다른 폴더 안(끝)으로, 또는 루트(null)로 이동 */
export function moveFolderUnder(
  folders: MockFolder[],
  folderId: string,
  targetParentId: string | null
): MockFolder[] | null {
  if (!canFolderMoveUnder(folders, folderId, targetParentId)) return null;
  const dragged = folders.find((f) => f.id === folderId);
  if (!dragged) return null;
  const without = folders.filter((f) => f.id !== folderId);
  const updated: MockFolder = { ...dragged, parentFolderId: targetParentId };

  let lastIdx = -1;
  for (let i = 0; i < without.length; i++) {
    if (without[i].parentFolderId === targetParentId) lastIdx = i;
  }
  const insertAt = lastIdx === -1 ? without.length : lastIdx + 1;
  return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
}

/** 폴더를 같은 레벨의 다른 폴더 기준으로 앞/뒤에 재배치 */
export function reorderFolderRelativeTo(
  folders: MockFolder[],
  folderId: string,
  referenceFolderId: string,
  position: "before" | "after"
): MockFolder[] | null {
  if (folderId === referenceFolderId) return null;
  const dragged = folders.find((f) => f.id === folderId);
  const ref = folders.find((f) => f.id === referenceFolderId);
  if (!dragged || !ref) return null;
  if (!canFolderMoveUnder(folders, folderId, ref.parentFolderId)) return null;

  const without = folders.filter((f) => f.id !== folderId);
  const refIdx = without.findIndex((f) => f.id === referenceFolderId);
  if (refIdx === -1) return null;
  const updated: MockFolder = { ...dragged, parentFolderId: ref.parentFolderId };
  const insertAt = position === "before" ? refIdx : refIdx + 1;
  return [...without.slice(0, insertAt), updated, ...without.slice(insertAt)];
}

/**
 * 드래그 중인 항목의 현재 rect와 드롭 대상 row의 rect를 비교해
 * before(위 1/4) / after(아래 1/4) / into(중간 1/2, 폴더에만 허용) 를 판정.
 */
export function computeDropPosition(
  activeRect: { top: number; height: number },
  overRect: { top: number; height: number },
  overAcceptsInto: boolean
): DropPosition {
  const activeCenterY = activeRect.top + activeRect.height / 2;
  const ratio = (activeCenterY - overRect.top) / overRect.height;
  if (ratio < 0.25) return "before";
  if (ratio > 0.75) return "after";
  return overAcceptsInto ? "into" : ratio < 0.5 ? "before" : "after";
}

/* ── dnd-kit 드래그/드롭 데이터 페이로드 ──────────────────────────── */
export interface DragActiveData {
  dragType: "folder" | "note";
  id: string;
  title: string;
}

export type DropTargetData =
  | { dropType: "folder"; id: string; parentFolderId: string | null }
  | { dropType: "note"; id: string; folderId: string | null }
  | { dropType: "root" };

export interface DropHandlers {
  moveNoteToFolder: (noteId: string, targetFolderId: string | null) => void;
  reorderNote: (noteId: string, referenceNoteId: string, position: "before" | "after") => void;
  moveFolderToParent: (folderId: string, targetParentId: string | null) => void;
  reorderFolder: (folderId: string, referenceFolderId: string, position: "before" | "after") => void;
}

export interface ResolvedDrop {
  valid: boolean;
  /** 시각 피드백을 표시할 행(또는 "root") id */
  indicatorTargetId: string;
  position: DropPosition;
  commit: (handlers: DropHandlers) => void;
}

/**
 * 현재 드래그 중인 항목(active)이 대상(over) 위에 있을 때 어떤 동작이 될지 판정하는 단일 진실 소스.
 * onDragOver(시각 피드백)와 onDragEnd(실제 커밋) 양쪽에서 동일하게 사용한다.
 */
export function resolveDrop(
  folders: MockFolder[],
  active: DragActiveData,
  over: DropTargetData,
  activeRect: { top: number; height: number },
  overRect: { top: number; height: number } | null
): ResolvedDrop | null {
  if (over.dropType === "root") {
    return {
      valid: true,
      indicatorTargetId: "root",
      position: "into",
      commit: (h) =>
        active.dragType === "note"
          ? h.moveNoteToFolder(active.id, null)
          : h.moveFolderToParent(active.id, null),
    };
  }
  if (!overRect) return null;

  if (active.dragType === "note") {
    if (over.dropType === "folder") {
      return {
        valid: true,
        indicatorTargetId: over.id,
        position: "into",
        commit: (h) => h.moveNoteToFolder(active.id, over.id),
      };
    }
    // note over note → 같은 레벨 형제로 재배치
    if (over.id === active.id) return null;
    const position = computeDropPosition(activeRect, overRect, false);
    const orderPos = position === "into" ? "after" : position;
    return {
      valid: true,
      indicatorTargetId: over.id,
      position,
      commit: (h) => h.reorderNote(active.id, over.id, orderPos),
    };
  }

  // 폴더를 드래그 중
  if (over.dropType === "note") {
    // 폴더는 노트 "안"으로 들어갈 수 없음 → 그 노트와 같은 부모 폴더로 이동
    return {
      valid: true,
      indicatorTargetId: over.id,
      position: "into",
      commit: (h) => h.moveFolderToParent(active.id, over.folderId ?? null),
    };
  }
  // 폴더 위에 폴더
  if (over.id === active.id) return null;
  const position = computeDropPosition(activeRect, overRect, true);
  const targetParent = position === "into" ? over.id : over.parentFolderId;
  const valid = canFolderMoveUnder(folders, active.id, targetParent);
  return {
    valid,
    indicatorTargetId: over.id,
    position,
    commit: (h) => {
      if (!valid) return;
      if (position === "into") h.moveFolderToParent(active.id, over.id);
      else h.reorderFolder(active.id, over.id, position);
    },
  };
}
