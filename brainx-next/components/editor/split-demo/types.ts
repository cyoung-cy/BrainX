export type NoteCategory = "backend" | "frontend" | "ai" | "architecture" | "database" | "devops";

export type SortOption = "modified" | "viewed" | "created" | "title" | "favorites" | "ai";

export interface MockFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  color?: string;
  favorite?: boolean;
}

export interface Tab {
  id: string;
  noteId: string;
}

export interface PaneTabsState {
  tabs: Tab[];
  activeTabId: string;
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
