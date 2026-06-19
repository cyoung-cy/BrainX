"use client";

import { clearAuthSession, isDemoSession, readAuthSession, type ApiResponse } from "@/lib/auth-api";

const COMMERCE_API_BASE_URL = process.env.NEXT_PUBLIC_COMMERCE_API_BASE_URL ?? "http://localhost:8084";

export const PAYMENT_RESULT_MESSAGE_TYPE = "brainx-payment-result";

export function isCommerceDemoSession() {
  return isDemoSession(readAuthSession());
}

export type Plan = {
  planId: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  entitlements: Record<string, unknown>;
};

export type SubscriptionStatus = "FREE" | "ACTIVE" | "PAST_DUE" | "CANCEL_SCHEDULED" | "CANCELLED" | string;

export type Subscription = {
  plan: { planId: string; name: string };
  status: SubscriptionStatus;
  renewalAt: string | null;
  entitlements: Record<string, unknown>;
};

export type CheckoutSession = {
  checkoutSessionId: string;
  provider: "toss" | "stripe";
  checkoutUrl: string | null;
  clientKey: string | null;
  orderId: string | null;
  orderName: string | null;
  amount: number | null;
  currency: string | null;
};

export type CheckoutConfirmResult = {
  checkoutSessionId: string;
  paymentId: string;
  status: "SUCCEEDED" | "FAILED";
  planId: string;
  subscriptionStatus: SubscriptionStatus;
};

function messageFromResponse<T>(response: ApiResponse<T>, fallback: string) {
  return response.message ?? response.error?.message ?? fallback;
}

async function authedRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = readAuthSession();

  if (session?.accessToken && isDemoSession(session)) {
    return demoCommerceResponse<T>(path, init);
  }

  // TEMP: 로그인 없이 결제 기능 테스트용. 실제 로그인 연동 완료 후
  // 아래 두 줄을 제거하고 session?.accessToken이 없으면 에러를 던지도록 되돌릴 것.
  const response = await fetch(`${COMMERCE_API_BASE_URL}${path}`, {
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

const DEMO_PLANS: Plan[] = [
  { planId: "free", name: "무료", price: 0, currency: "KRW", features: ["노트 무제한", "AI 토큰 월 50,000"], entitlements: { tier: 0 } },
  { planId: "pro", name: "Pro", price: 500, currency: "KRW", features: ["AI 토큰 월 100만", "시맨틱 검색"], entitlements: { tier: 1 } },
  { planId: "max", name: "Max", price: 1000, currency: "KRW", features: ["AI 토큰 무제한", "팀 공유"], entitlements: { tier: 2 } }
];

let demoSubscription: Subscription = {
  plan: { planId: "free", name: "무료" },
  status: "FREE",
  renewalAt: null,
  entitlements: { tier: 0 }
};

function demoCommerceResponse<T>(path: string, init?: RequestInit): T {
  const method = init?.method?.toUpperCase() ?? "GET";

  if (path === "/api/v1/plans" && method === "GET") {
    return { plans: DEMO_PLANS } as T;
  }

  if (path === "/api/v1/users/me/subscription" && method === "GET") {
    return demoSubscription as T;
  }

  // 데모 세션은 실제 결제를 할 수 없으니 결제 없이 즉시 플랜을 바꿔준다.
  if (path === "/api/v1/subscriptions/change" && method === "POST") {
    const body = parseBody<{ targetPlanId?: string }>(init);
    const plan = DEMO_PLANS.find((item) => item.planId === body.targetPlanId) ?? DEMO_PLANS[0];
    demoSubscription = {
      plan: { planId: plan.planId, name: plan.name },
      status: plan.planId === "free" ? "FREE" : "ACTIVE",
      renewalAt: plan.planId === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      entitlements: plan.entitlements
    };
    return { planId: plan.planId, status: demoSubscription.status, changedAt: new Date().toISOString() } as T;
  }

  throw new Error("데모 모드에서는 실제 결제를 진행할 수 없습니다. 플랜 변경만 즉시 적용됩니다.");
}

export async function getPlans() {
  const data = await authedRequest<{ plans: Plan[] }>("/api/v1/plans");
  return data.plans;
}

export async function getMySubscription() {
  return authedRequest<Subscription>("/api/v1/users/me/subscription");
}

export async function createCheckoutSession(planId: string, successUrl: string, cancelUrl: string) {
  return authedRequest<CheckoutSession>("/api/v1/subscriptions/checkout-sessions", {
    method: "POST",
    body: JSON.stringify({ planId, successUrl, cancelUrl })
  });
}

export async function confirmCheckoutSession(checkoutSessionId: string, paymentKey: string, orderId: string, amount: number) {
  return authedRequest<CheckoutConfirmResult>(`/api/v1/subscriptions/checkout-sessions/${checkoutSessionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ paymentKey, orderId, amount })
  });
}

export async function changeSubscriptionDemo(targetPlanId: string) {
  return authedRequest<{ planId: string; status: string; changedAt: string }>("/api/v1/subscriptions/change", {
    method: "POST",
    body: JSON.stringify({ targetPlanId })
  });
}

export async function cancelSubscription(cancelAtPeriodEnd: boolean) {
  return authedRequest<{ planId: string; status: string; cancelAt: string | null }>("/api/v1/subscriptions/cancel", {
    method: "POST",
    body: JSON.stringify({ cancelAtPeriodEnd })
  });
}
