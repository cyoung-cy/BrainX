"use client";

import { clearAuthSession, readAuthSession, saveAuthSession, type ApiResponse } from "@/lib/auth-api";

export type MyProfile = {
  userId: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  role: string;
  security: {
    twoFactorEnabled: boolean;
    linkedProviders: string[];
    hasPassword?: boolean;
  };
  consents: {
    termsRequired: boolean;
    privacyRequired: boolean;
    marketingOptional: boolean;
    behaviorAnalyticsOptional: boolean;
    updatedAt: string | null;
  };
};

export type ConsentPayload = {
  termsRequired: boolean;
  privacyRequired: boolean;
  marketingOptional: boolean;
  behaviorAnalyticsOptional: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class AuthRequiredError extends Error {
  constructor(message = "로그인이 만료되었습니다. 다시 로그인해 주세요.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

function messageFromResponse<T>(response: ApiResponse<T>, fallback: string) {
  return response.message ?? response.error?.message ?? fallback;
}

async function authedRequest<T>(path: string, init?: RequestInit) {
  const session = readAuthSession();
  if (!session?.accessToken) {
    throw new AuthRequiredError("로그인이 필요합니다.");
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
    throw new AuthRequiredError();
  }
  if (!payload) {
    throw new Error("서버 응답을 읽을 수 없습니다.");
  }
  if (!response.ok || !payload.success) {
    throw new Error(messageFromResponse(payload, "요청 처리에 실패했습니다."));
  }
  return payload.data as T;
}

export async function getMyProfile() {
  const data = await authedRequest<MyProfile | IdentityProfileResponse>("/api/v1/users/me");
  return normalizeProfile(data);
}

type ProfileUpdateResult = { userId: string; nickname: string; profileImageUrl: string | null };

export async function updateMyProfile(payload: { nickname: string; profileImageAssetId?: string | null }): Promise<ProfileUpdateResult> {
  const data = await authedRequest<
    | ProfileUpdateResult
    | IdentityProfileResponse
  >(
    "/api/v1/users/me/profile",
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    }
  );
  const normalized = normalizeProfileUpdate(data);
  saveAuthSession({ ...(readAuthSession() ?? {}), nickname: normalized.nickname, profileImageUrl: normalized.profileImageUrl });
  return normalized;
}

export async function changeMyPassword(payload: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}) {
  return authedRequest<null>("/api/v1/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      newPasswordConfirm: payload.newPasswordConfirm
    })
  });
}

export async function configureEmail2fa(enabled: boolean) {
  return authedRequest<{ verificationId: string }>("/api/v1/users/me/2fa/email", {
    method: "POST",
    body: JSON.stringify({ enabled })
  });
}

export async function linkSocialAccount(provider: string, oauthCode: string) {
  return authedRequest<{ provider: string; linked: boolean }>("/api/v1/users/me/social-accounts", {
    method: "POST",
    body: JSON.stringify({ provider, oauthCode })
  });
}

export async function unlinkSocialAccount(provider: string) {
  return authedRequest<{ provider: string; linked: boolean }>(`/api/v1/users/me/social-accounts/${provider}`, {
    method: "DELETE"
  });
}

export async function updateMyConsents(payload: ConsentPayload) {
  const data = await authedRequest<(ConsentPayload & { updatedAt?: string }) | { ok: boolean }>("/api/v1/users/me/consents", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  if ("termsRequired" in data) return { ...data, updatedAt: data.updatedAt ?? "" };
  return { ...payload, updatedAt: "" };
}

export async function requestAccountDeletion(reason: string) {
  return authedRequest<{ deletionScheduledAt: string }>("/api/v1/users/me/deletion-request", {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function cancelAccountDeletion() {
  return authedRequest<null>("/api/v1/users/me/deletion-request", {
    method: "DELETE"
  });
}

type IdentityProfileResponse = {
  userId: string;
  email: string;
  profile?: {
    nickname?: string | null;
    profileImageUrl?: string | null;
  } | null;
  nickname?: string | null;
  profileImageUrl?: string | null;
  role?: string;
  security?: {
    twoFactorEnabled?: boolean;
    linkedProviders?: string[];
    hasPassword?: boolean;
  } | null;
  consents?: {
    termsRequired?: boolean;
    privacyRequired?: boolean;
    marketingOptional?: boolean;
    behaviorAnalyticsOptional?: boolean;
    updatedAt?: string | null;
  } | null;
};

function normalizeProfile(data: MyProfile | IdentityProfileResponse): MyProfile {
  if (isIdentityProfile(data)) {
    return {
      userId: data.userId,
      email: data.email,
      nickname: data.profile?.nickname ?? data.nickname ?? "",
      profileImageUrl: data.profile?.profileImageUrl ?? data.profileImageUrl ?? null,
      role: data.role ?? "ROLE_USER",
      security: {
        twoFactorEnabled: data.security?.twoFactorEnabled ?? false,
        linkedProviders: data.security?.linkedProviders ?? [],
        hasPassword: data.security?.hasPassword
      },
      consents: {
        termsRequired: data.consents?.termsRequired ?? true,
        privacyRequired: data.consents?.privacyRequired ?? true,
        marketingOptional: data.consents?.marketingOptional ?? false,
        behaviorAnalyticsOptional: data.consents?.behaviorAnalyticsOptional ?? false,
        updatedAt: data.consents?.updatedAt ?? null
      }
    };
  }
  return data as MyProfile;
}

function normalizeProfileUpdate(
  data: ProfileUpdateResult | IdentityProfileResponse
): ProfileUpdateResult {
  if (isIdentityProfile(data)) {
    return {
      userId: data.userId,
      nickname: data.profile?.nickname ?? data.nickname ?? "",
      profileImageUrl: data.profile?.profileImageUrl ?? data.profileImageUrl ?? null
    };
  }
  return {
    userId: data.userId,
    nickname: data.nickname,
    profileImageUrl: data.profileImageUrl
  };
}

function isIdentityProfile(data: MyProfile | ProfileUpdateResult | IdentityProfileResponse): data is IdentityProfileResponse {
  return "profile" in data;
}
