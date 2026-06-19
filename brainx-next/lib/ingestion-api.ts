"use client";

import { clearAuthSession, isDemoSession, readAuthSession, type ApiResponse } from "@/lib/auth-api";

const INGESTION_API_BASE_URL = process.env.NEXT_PUBLIC_INGESTION_API_BASE_URL ?? "http://localhost:8083";

const NOTION_INTEGRATION_KEY = "brainx_notion_integration_v1";
const NOTION_OAUTH_STATE_KEY = "brainx_notion_oauth_state_v1";

export const NOTION_OAUTH_MESSAGE_TYPE = "brainx-notion-oauth-result";

export type NotionIntegration = {
  integrationAccountId: string;
  connectedAt: string;
};

export type NotionPage = {
  id: string;
  title: string;
  icon?: string | null;
  lastEditedTime?: string | null;
};

type OAuthUrlData = {
  authorizationUrl: string;
  state: string;
};

type IntegrationConnectedData = {
  integrationAccountId: string;
};

type NotionPagesData = {
  pages: NotionPage[];
};

export type ImportJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;

type ImportJobAcceptedData = {
  importJobId: string;
  status: ImportJobStatus;
};

export type ImportJobData = {
  importJobId: string;
  status: ImportJobStatus;
  createdNotes: Array<{ noteId?: string; title?: string }>;
  failedFiles: Array<{ fileName?: string; reason?: string }>;
  conflicts: unknown[];
};

function messageFromResponse<T>(response: ApiResponse<T>, fallback: string) {
  return response.message ?? response.error?.message ?? fallback;
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readAuthSession();

  if (session?.accessToken && isDemoSession(session)) {
    return demoIngestionResponse<T>(path, init);
  }

  // TEMP: 로그인 없이 Notion 가져오기 기능 테스트용. 실제 로그인 연동 완료 후
  // 아래 두 줄을 제거하고 session?.accessToken이 없으면 에러를 던지도록 되돌릴 것.
  const response = await fetch(`${INGESTION_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (response.status === 401 || response.status === 403) {
    clearAuthSession();
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (!payload) {
    throw new Error("서버 응답을 읽을 수 없습니다.");
  }
  if (!response.ok || !payload.success) {
    throw new Error(messageFromResponse(payload, "요청 처리에 실패했습니다."));
  }
  return payload.data as T;
}

function parseBody<T>(init?: RequestInit): Partial<T> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Partial<T>;
  } catch {
    return {};
  }
}

const DEMO_NOTION_PAGES: NotionPage[] = [
  { id: "demo-page-msa", title: "BrainX MSA 설계 노트", icon: "🧠", lastEditedTime: new Date().toISOString() },
  { id: "demo-page-meeting", title: "주간 회의록", icon: "📋", lastEditedTime: new Date().toISOString() },
  { id: "demo-page-roadmap", title: "제품 로드맵 2026", icon: "🗺️", lastEditedTime: new Date().toISOString() }
];

function demoIngestionResponse<T>(path: string, init?: RequestInit): T {
  const method = init?.method?.toUpperCase() ?? "GET";

  if (path === "/api/v1/imports/notion/oauth/callback" && method === "POST") {
    return { integrationAccountId: "demo-notion-account" } as T;
  }

  if (path.startsWith("/api/v1/imports/notion/pages") && method === "GET") {
    return { pages: DEMO_NOTION_PAGES } as T;
  }

  if (path === "/api/v1/imports/notion/jobs" && method === "POST") {
    const body = parseBody<{ sourceId?: string }>(init);
    const page = DEMO_NOTION_PAGES.find((item) => item.id === body.sourceId);
    return { importJobId: `demo-job-${body.sourceId}`, status: "COMPLETED", _demoPageTitle: page?.title } as T;
  }

  if (path.startsWith("/api/v1/imports/demo-job-") && method === "GET") {
    const sourceId = path.replace("/api/v1/imports/demo-job-", "");
    const page = DEMO_NOTION_PAGES.find((item) => item.id === sourceId);
    return {
      importJobId: path.split("/").pop(),
      status: "COMPLETED",
      createdNotes: [{ noteId: `demo-note-${sourceId}`, title: page?.title ?? "데모 노트" }],
      failedFiles: [],
      conflicts: []
    } as T;
  }

  throw new Error("데모 모드에서 지원하지 않는 가져오기 API입니다.");
}

export function readNotionIntegration(): NotionIntegration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NOTION_INTEGRATION_KEY);
    return raw ? (JSON.parse(raw) as NotionIntegration) : null;
  } catch {
    return null;
  }
}

export function saveNotionIntegration(integrationAccountId: string) {
  if (typeof window === "undefined") return;
  const integration: NotionIntegration = { integrationAccountId, connectedAt: new Date().toISOString() };
  window.localStorage.setItem(NOTION_INTEGRATION_KEY, JSON.stringify(integration));
}

export function clearNotionIntegration() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NOTION_INTEGRATION_KEY);
}

export function isNotionDemoSession() {
  return isDemoSession(readAuthSession());
}

// 데모 세션은 실제 Notion OAuth를 거칠 수 없으므로 즉시 연동 완료 처리한다.
export function connectNotionDemo() {
  saveNotionIntegration("demo-notion-account");
  return readNotionIntegration() as NotionIntegration;
}

export async function startNotionOAuth() {
  const data = await authedRequest<OAuthUrlData>("/api/v1/imports/notion/oauth/authorize", {
    method: "POST",
    body: JSON.stringify({})
  });
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(NOTION_OAUTH_STATE_KEY, data.state);
  }
  return data;
}

export function consumeNotionOAuthState() {
  if (typeof window === "undefined") return null;
  const state = window.sessionStorage.getItem(NOTION_OAUTH_STATE_KEY);
  window.sessionStorage.removeItem(NOTION_OAUTH_STATE_KEY);
  return state;
}

export async function completeNotionOAuth(code: string, state: string) {
  const data = await authedRequest<IntegrationConnectedData>("/api/v1/imports/notion/oauth/callback", {
    method: "POST",
    body: JSON.stringify({ code, state })
  });
  saveNotionIntegration(data.integrationAccountId);
  return data;
}

export async function listNotionPages(integrationAccountId: string) {
  const data = await authedRequest<NotionPagesData>(
    `/api/v1/imports/notion/pages?integrationAccountId=${encodeURIComponent(integrationAccountId)}`
  );
  return data.pages;
}

export async function importNotionPage(integrationAccountId: string, sourceId: string, targetFolderId?: string) {
  return authedRequest<ImportJobAcceptedData>("/api/v1/imports/notion/jobs", {
    method: "POST",
    body: JSON.stringify({ integrationAccountId, sourceId, mode: "IMPORT", targetFolderId })
  });
}

export async function getImportJobStatus(importJobId: string) {
  return authedRequest<ImportJobData>(`/api/v1/imports/${importJobId}`);
}
