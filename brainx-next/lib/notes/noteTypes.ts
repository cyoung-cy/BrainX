export type NoteCategory = "backend" | "frontend" | "ai" | "architecture" | "database" | "devops";

export type SortOption = "modified" | "viewed" | "created" | "title" | "favorites" | "ai";

export interface MockFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  color?: string;
  favorite?: boolean;
}

export interface MockNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: NoteCategory;
  folderId?: string;
  createdAt: number;
  updatedAt: number;
}

/** 일반 노트 탭 */
export interface NoteTab {
  id: string;
  kind: "note";
  noteId: string;
}

/** Obsidian 스타일 빈 시작 탭 — 새 파일 생성하기/파일로 이동하기/닫기 */
export interface StartTab {
  id: string;
  kind: "start";
}

export type Tab = NoteTab | StartTab;

export interface PaneTabsState {
  tabs: Tab[];
  activeTabId: string;
}

export interface PaneLeaf {
  type: "leaf";
  id: string;
  noteId: string;
}

export interface PaneSplit {
  type: "split";
  id: string;
  /** horizontal = 좌|우 분할, vertical = 위/아래 분할 */
  direction: "horizontal" | "vertical";
  children: PaneNode[];
}

export type PaneNode = PaneLeaf | PaneSplit;

/** localStorage에 저장되는 워크스페이스 세션 전체 상태 */
export interface NotesWorkspaceSession {
  root: PaneNode;
  activeId: string;
  paneTabs: Record<string, PaneTabsState>;
  notes: MockNote[];
  folders: MockFolder[];
}
