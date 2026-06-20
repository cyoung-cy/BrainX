"use client";

import { clearAuthSession, isDemoSession, readAuthSession, type ApiResponse } from "@/lib/auth-api";

const WORKSPACE_API_BASE_URL = process.env.NEXT_PUBLIC_WORKSPACE_API_BASE_URL ?? "http://localhost:8082";

export type NoteDetail = {
  noteId: string;
  title: string;
  markdown: string;
  folder: { folderId: string; name: string } | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

function messageFromResponse<T>(response: ApiResponse<T>, fallback: string) {
  return response.message ?? response.error?.message ?? fallback;
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readAuthSession();

  if (session?.accessToken && isDemoSession(session)) {
    return demoWorkspaceResponse<T>(path);
  }

  // TEMP: 로그인 없이 Notion 가져오기 기능 테스트용. 실제 로그인 연동 완료 후
  // 아래 두 줄을 제거하고 session?.accessToken이 없으면 에러를 던지도록 되돌릴 것.
  const response = await fetch(`${WORKSPACE_API_BASE_URL}${path}`, {
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

function demoWorkspaceResponse<T>(path: string): T {
  const noteId = path.split("/").pop() ?? "demo-note";
  return {
    noteId,
    title: "데모 노트",
    markdown: "Notion에서 가져온 데모 노트 본문입니다.",
    folder: null,
    tags: ["notion"],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as T;
}

export async function getNote(noteId: string) {
  return authedRequest<NoteDetail>(`/api/v1/notes/${noteId}`);
}
