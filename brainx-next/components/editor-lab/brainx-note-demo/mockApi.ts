/* BrainX Note Demo — Mock API Service
 * Real API endpoints to wire up later are listed as comments above each function.
 */

import { NoteData, MOCK_NOTES, getNoteById } from "./mockData";

/* ── Types ───────────────────────────────────── */

export interface BacklinkEntry {
  noteId: string;
  noteTitle: string;
  excerpt: string;
  mentionCount: number;
}

export interface AiInlineResult {
  original: string;
  result: string;
  action: string;
}

export interface SearchResult {
  noteId: string;
  title: string;
  excerpt: string;
  score: number;
  tags: string[];
}

export type ExportFormat = "markdown" | "pdf" | "html" | "obsidian-zip";
export type ImportSource = "markdown" | "obsidian" | "notion";
export type AiAction =
  | "summarize"
  | "translate"
  | "rewrite"
  | "shorter"
  | "longer"
  | "correct-grammar"
  | "explain"
  | "suggest-tags";

/* ── Mock API functions ──────────────────────── */

// GET /api/v1/notes/{noteId}
export async function fetchNote(noteId: string): Promise<NoteData | null> {
  await delay(120);
  return getNoteById(noteId) ?? null;
}

// PUT /api/v1/notes/{noteId}/content
export async function saveNoteContent(
  noteId: string,
  content: string
): Promise<{ updatedAt: string }> {
  await delay(300);
  const now = new Date().toISOString();
  const note = MOCK_NOTES.find((n) => n.id === noteId);
  if (note) note.content = content;
  return { updatedAt: now };
}

// PATCH /api/v1/notes/{noteId}/metadata
export async function updateNoteMeta(
  noteId: string,
  patch: Partial<Pick<NoteData, "title" | "tags" | "status">>
): Promise<NoteData | null> {
  await delay(200);
  const note = MOCK_NOTES.find((n) => n.id === noteId);
  if (!note) return null;
  Object.assign(note, patch, { updatedAt: new Date().toISOString() });
  return note;
}

// GET /api/v1/notes/{noteId}/backlinks
export async function fetchBacklinks(noteId: string): Promise<BacklinkEntry[]> {
  await delay(150);
  const note = getNoteById(noteId);
  if (!note) return [];
  return note.backlinks
    .map((id) => {
      const ref = getNoteById(id);
      if (!ref) return null;
      const excerpt = ref.content.slice(0, 120).replace(/#+\s/g, "").trim();
      return {
        noteId: id,
        noteTitle: ref.title,
        excerpt: excerpt + "…",
        mentionCount: 1,
      };
    })
    .filter(Boolean) as BacklinkEntry[];
}

// POST /api/v1/notes/{noteId}/links
export async function addNoteLink(
  _sourceId: string,
  _targetId: string
): Promise<void> {
  await delay(100);
}

// GET /api/v1/graph
export async function fetchGraph(): Promise<{
  nodes: { id: string; title: string; tags: string[]; linkCount: number }[];
  edges: { source: string; target: string }[];
}> {
  await delay(200);
  const nodes = MOCK_NOTES.map((n) => ({
    id: n.id,
    title: n.title,
    tags: n.tags,
    linkCount: n.backlinks.length + n.outgoingLinks.length,
  }));
  const edges: { source: string; target: string }[] = [];
  MOCK_NOTES.forEach((n) => {
    n.outgoingLinks.forEach((t) => {
      edges.push({ source: n.id, target: t });
    });
  });
  return { nodes, edges };
}

// POST /api/v1/intelligence/semantic-search
export async function semanticSearch(query: string): Promise<SearchResult[]> {
  await delay(400);
  const q = query.toLowerCase();
  return MOCK_NOTES.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.includes(q))
  )
    .slice(0, 5)
    .map((n) => ({
      noteId: n.id,
      title: n.title,
      excerpt:
        n.content.split("\n").find((l) => l.toLowerCase().includes(q)) ??
        n.aiSummary.slice(0, 100) + "…",
      score: Math.random() * 0.3 + 0.7,
      tags: n.tags,
    }));
}

// POST /api/v1/ai/inline-assists
export async function aiInlineAssist(
  selectedText: string,
  action: AiAction
): Promise<AiInlineResult> {
  await delay(800);
  const mockResults: Record<AiAction, string> = {
    summarize: `핵심 요약: ${selectedText.slice(0, 60)}...에 대한 내용을 간략히 정리한 내용입니다.`,
    translate:
      "This is an AI-generated English translation of the selected Korean text.",
    rewrite: `다시 쓴 내용: ${selectedText.slice(0, 40)}을(를) 더 명확하게 표현하면 다음과 같습니다.`,
    shorter: selectedText.slice(0, Math.floor(selectedText.length * 0.5)) + "...",
    longer: selectedText + "\n\n추가 설명: 위 내용을 더 자세히 살펴보면, 관련된 개념들이 서로 긴밀하게 연결되어 있음을 알 수 있습니다.",
    "correct-grammar": selectedText.replace(/하였/g, "했").replace(/이었/g, "였"),
    explain: `설명: "${selectedText.slice(0, 30)}"은(는) 소프트웨어 개발에서 중요한 개념으로, 시스템의 효율성과 확장성을 높이는 데 기여합니다.`,
    "suggest-tags": "#architecture #backend #api #design-pattern",
  };
  return {
    original: selectedText,
    result: mockResults[action] ?? selectedText,
    action,
  };
}

// POST /api/v1/ai/chat-threads/{threadId}/messages
export async function aiChat(
  _threadId: string,
  message: string,
  noteContext: string
): Promise<string> {
  await delay(600);
  return `「${noteContext}」 노트를 참고했습니다.\n\n"${message.slice(0, 20)}..."에 대한 답변: 이 내용은 BrainX의 핵심 기능과 연관되어 있으며, 관련된 노트들을 함께 살펴보면 더 깊은 이해가 가능합니다.`;
}

// POST /api/v1/assets/upload-sessions
export async function startUploadSession(
  fileName: string,
  fileType: string
): Promise<{ sessionId: string; uploadUrl: string }> {
  await delay(200);
  return {
    sessionId: `session-${Date.now()}`,
    uploadUrl: `https://cdn.brainx.app/upload/${fileName}`,
  };
}

// POST /api/v1/exports
export async function exportNotes(
  noteIds: string[],
  format: ExportFormat
): Promise<{ downloadUrl: string; expiresAt: string }> {
  await delay(1500);
  return {
    downloadUrl: `https://cdn.brainx.app/exports/brainx-export-${Date.now()}.${
      format === "obsidian-zip" ? "zip" : format
    }`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

// POST /api/v1/imports/obsidian/jobs
export async function startObsidianImport(
  _file: File
): Promise<{ jobId: string }> {
  await delay(300);
  return { jobId: `obsidian-import-${Date.now()}` };
}

// POST /api/v1/imports/notion/jobs
export async function startNotionImport(
  _file: File
): Promise<{ jobId: string }> {
  await delay(300);
  return { jobId: `notion-import-${Date.now()}` };
}

/* ── Helpers ─────────────────────────────────── */

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
