"use client";

import { clearAuthSession, readAuthSession, type ApiResponse } from "@/lib/auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type SupportInquiry = {
  inquiryId: string;
  category: string;
  title: string;
  content: string;
  status: "RECEIVED" | "IN_PROGRESS" | "ANSWERED" | "CLOSED" | string;
  createdAt: string;
  updatedAt: string | null;
};

export type SupportInquiryPayload = {
  category: string;
  title: string;
  content: string;
};

function messageFromResponse<T>(response: ApiResponse<T>, fallback: string) {
  return response.message ?? response.error?.message ?? fallback;
}

async function authedRequest<T>(path: string, init?: RequestInit) {
  const session = readAuthSession();
  if (!session?.accessToken) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `${session.tokenType ?? "Bearer"} ${session.accessToken}`,
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

export function getMySupportInquiries() {
  return authedRequest<SupportInquiry[]>("/api/v1/support/inquiries");
}

export function createSupportInquiry(payload: SupportInquiryPayload) {
  return authedRequest<SupportInquiry>("/api/v1/support/inquiries", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
