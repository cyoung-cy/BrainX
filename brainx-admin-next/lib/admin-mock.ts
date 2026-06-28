import {
  adminProfile,
  billingSubscriptions,
  billingTransactions,
  failedBilling,
  inquiries,
  kpis,
  logs,
  planCards,
  revenueBars,
  services,
  traffic,
  users,
  type AdminRole,
  type InquiryStatus,
  type PaymentStatus,
  type Plan,
  type UserStatus
} from "@/lib/admin-data";

const now = "2026-06-25T09:14:00+09:00";

type MockAdminAccount = {
  adminId: string;
  name: string;
  loginId: string;
  password: string;
  role: AdminRole;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

const mockAdminAccounts: MockAdminAccount[] = [
  { adminId: "adm_001", name: adminProfile.name, loginId: "admin", password: "admin1234", role: "owner", mustChangePassword: false, createdAt: adminProfile.createdAt, lastLoginAt: adminProfile.lastLoginAt }
];

function apiAdminAccount(account: MockAdminAccount) {
  return {
    adminId: account.adminId,
    name: account.name,
    loginId: account.loginId,
    role: account.role,
    mustChangePassword: account.mustChangePassword,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt
  };
}

function generateMockPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const planToApi = (plan: Plan) => plan;
const userStatusToApi: Record<UserStatus, "ACTIVE" | "SUSPENDED" | "WITHDRAWN"> = {
  active: "ACTIVE",
  suspended: "SUSPENDED",
  withdrawn: "WITHDRAWN"
};
const ticketStatusToApi: Record<InquiryStatus, "OPEN" | "IN_PROGRESS" | "RESOLVED"> = {
  pending: "OPEN",
  progress: "IN_PROGRESS",
  done: "RESOLVED"
};
const paymentStatusToApi: Record<PaymentStatus, "SUCCESS" | "FAILED" | "REFUNDED" | "CANCELED"> = {
  success: "SUCCESS",
  failed: "FAILED",
  refunded: "REFUNDED",
  canceled: "CANCELED"
};

function json(data: unknown, status = 200) {
  return Response.json({ success: true, data, message: "요청이 성공적으로 처리되었습니다." }, { status });
}

function noContent() {
  return new Response(null, { status: 204 });
}

function dateTimeFromShort(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00:00+09:00`;
  if (/^\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return `2026-${value.replace(" ", "T")}:00+09:00`;
  return now;
}

function storageToBytes(value: string) {
  if (value.endsWith("GB")) return Math.round(Number(value.replace("GB", "")) * 1024 * 1024 * 1024);
  if (value.endsWith("MB")) return Math.round(Number(value.replace("MB", "")) * 1024 * 1024);
  return 0;
}

function lastActiveToDateTime(value: string) {
  if (value === "방금") return now;
  if (value.includes("분")) return "2026-06-25T09:09:00+09:00";
  if (value.includes("시간")) return "2026-06-25T08:14:00+09:00";
  if (value === "어제") return "2026-06-24T14:00:00+09:00";
  if (value.includes("일")) return "2026-06-22T14:00:00+09:00";
  return null;
}

function apiUser(user: typeof users[number]) {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    planId: planToApi(user.plan),
    status: userStatusToApi[user.status],
    noteCount: user.notes,
    storageBytes: storageToBytes(user.storage),
    joinedAt: dateTimeFromShort(user.joined),
    lastActiveAt: lastActiveToDateTime(user.lastActive),
    lastLogin: {
      sessionId: `${user.id}-session-current`,
      device: user.device,
      location: user.location,
      ipAddress: "121.168.32.104",
      userAgentHash: "mock-user-agent-hash",
      lastSeenAt: lastActiveToDateTime(user.lastActive) ?? now,
      current: user.status === "active"
    },
    sessions: [
      {
        sessionId: `${user.id}-session-current`,
        device: user.device,
        location: user.location,
        ipAddress: "121.168.32.104",
        userAgentHash: "mock-user-agent-hash",
        lastSeenAt: lastActiveToDateTime(user.lastActive) ?? now,
        current: user.status === "active"
      },
      {
        sessionId: `${user.id}-session-previous`,
        device: user.device,
        location: user.location,
        ipAddress: "211.45.18.72",
        userAgentHash: "mock-user-agent-hash-prev",
        lastSeenAt: now,
        current: false
      }
    ],
    activities: user.activities.map((activity, index) => ({
      activityId: `${user.id}-activity-${index}`,
      type: "USER_ACTIVITY",
      message: activity.text,
      occurredAt: lastActiveToDateTime(activity.time) ?? now
    }))
  };
}

function apiTicket(ticket: typeof inquiries[number]) {
  return {
    ticketId: ticket.id,
    userId: users.find((user) => user.email === ticket.email)?.id ?? ticket.email,
    userName: ticket.user,
    email: ticket.email,
    status: ticketStatusToApi[ticket.status],
    category: ticket.category,
    subject: ticket.subject,
    createdAt: dateTimeFromShort(ticket.created),
    assigneeAdminUserId: ticket.agent ? "adm_001" : null,
    assigneeAdminName: ticket.agent || null,
    urgent: ticket.urgent,
    body: ticket.body
  };
}

function apiPayment(payment: typeof billingTransactions[number]) {
  return {
    paymentId: payment.id,
    transactionId: payment.id,
    userId: users.find((user) => user.name === payment.user)?.id ?? payment.user,
    userName: payment.user,
    planId: planToApi(payment.plan),
    amount: payment.amount,
    currency: "KRW",
    method: payment.method,
    status: paymentStatusToApi[payment.status],
    paidAt: dateTimeFromShort(payment.date)
  };
}

function apiSubscription(subscription: typeof billingSubscriptions[number]) {
  return {
    subscriptionId: subscription.subscriptionId,
    userId: users.find((user) => user.name === subscription.user)?.id ?? subscription.user,
    userName: subscription.user,
    initial: subscription.initial,
    planId: planToApi(subscription.plan),
    startedAt: dateTimeFromShort(subscription.started),
    nextBillingAt: `2026-${subscription.next}T09:00:00+09:00`,
    amount: subscription.amount,
    currency: "KRW"
  };
}

function apiFailure(failure: typeof failedBilling[number]) {
  const planId = failure.plan === "Max" ? "max" : failure.plan === "Pro" ? "pro" : "free";
  return {
    paymentId: failure.paymentId,
    userId: users.find((user) => user.name === failure.user)?.id ?? failure.user,
    userName: failure.user,
    planId,
    amount: Number(failure.amount.replace(/[^0-9]/g, "")),
    currency: "KRW",
    reason: failure.reason.split("·")[0].trim(),
    retryCount: Number(failure.reason.match(/(\d+)회/)?.[1] ?? 0),
    failedAt: dateTimeFromShort(failure.date)
  };
}

function apiPlan(plan: typeof planCards[number]) {
  return {
    planId: plan.key,
    name: plan.name,
    price: plan.price,
    currency: "KRW",
    description: plan.desc,
    effectiveAt: null
  };
}

export async function handleAdminMockRequest(request: Request, segments: string[]) {
  const method = request.method;
  const path = segments.join("/");

  if (method === "GET" && path === "dashboard/overview") {
    return json({
      kpis,
      services,
      logs,
      revenueTrend: revenueBars,
      activeUserTrend: traffic
    });
  }

  if (method === "GET" && path === "monitoring/snapshots") {
    return json([
      {
        snapshotId: "ams_mock0001",
        monthlyRevenue: 184200000,
        activeSubscriptions: 1026,
        mrr: 28400000,
        failedPaymentCount: failedBilling.length,
        activeUsers: traffic[traffic.length - 1] ?? 0,
        capturedAt: now
      }
    ]);
  }

  if (method === "DELETE" && segments[0] === "monitoring" && segments[1] === "snapshots" && segments[2]) {
    return noContent();
  }

  if (method === "GET" && path === "monitoring/health") {
    return json(
      services.map((service, index) => ({
        healthSnapshotId: `ash_mock${index}`,
        serviceName: service.name,
        state: service.state,
        latencyMs: Number(service.latency.replace(/[^0-9]/g, "")) || 0,
        uptimePercent: Number(service.uptime.replace("%", "")) || 0,
        capturedAt: now
      }))
    );
  }

  if (method === "DELETE" && segments[0] === "monitoring" && segments[1] === "health" && segments[2]) {
    return noContent();
  }

  if (method === "GET" && path === "users") {
    return json({
      users: users.map(apiUser),
      pagination: { page: 0, size: users.length, totalItems: users.length, totalPages: 1 },
      resultCount: users.length
    });
  }

  if (method === "GET" && segments[0] === "users" && segments[1]) {
    const user = users.find((item) => item.id === segments[1]);
    if (!user) return Response.json({ error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } }, { status: 404 });
    return json(apiUser(user));
  }

  if (method === "PATCH" && segments[0] === "users" && segments[2] === "plan") {
    const body = await request.json().catch(() => ({ targetPlanId: "free" }));
    return json({ userId: segments[1], planId: body.targetPlanId, changedAt: now });
  }

  if (method === "PATCH" && segments[0] === "users" && segments[2] === "status") {
    const body = await request.json().catch(() => ({ status: "ACTIVE" }));
    return json({ userId: segments[1], status: body.status, changedAt: now });
  }

  if (method === "POST" && segments[0] === "users" && segments[2] === "withdrawal") {
    return json({ userId: segments[1], deletionRequestId: `DEL-${segments[1]}`, status: "REQUESTED" }, 202);
  }

  if (method === "POST" && path === "users/bulk-actions") {
    const body = await request.json().catch(() => ({ userIds: [] }));
    return json({ accepted: body.userIds?.length ?? 0, failed: 0, jobId: `JOB-${Date.now()}` }, 202);
  }

  if (method === "GET" && path === "support/tickets") {
    return json({ tickets: inquiries.map(apiTicket) });
  }

  if (segments[0] === "support" && segments[1] === "tickets" && segments[2]) {
    const ticket = inquiries.find((item) => item.id === segments[2]);
    if (method === "GET") return json({ ticket: ticket ? apiTicket(ticket) : null });
    if (method === "PATCH") return json({ ticket: ticket ? apiTicket(ticket) : null });
    if (method === "POST" && segments[3] === "replies") {
      return json({ replyId: `RPL-${Date.now()}`, ticketId: segments[2] }, 201);
    }
    if (method === "DELETE") {
      return noContent();
    }
  }

  if (method === "GET" && path === "billing/summary") {
    return json({
      monthlyRevenue: 184200000,
      activeSubscriptions: 1026,
      mrr: 28400000,
      failedPaymentCount: failedBilling.length
    });
  }

  if (method === "GET" && path === "billing/payments") {
    return json({ payments: billingTransactions.map(apiPayment), pagination: { page: 0, size: billingTransactions.length, totalItems: billingTransactions.length, totalPages: 1 } });
  }

  if (method === "POST" && segments[0] === "billing" && segments[1] === "payments" && segments[3] === "refund") {
    return json({ paymentId: segments[2], status: "REFUND_REQUESTED", acceptedAt: now }, 202);
  }

  if (method === "POST" && segments[0] === "billing" && segments[1] === "payments" && segments[3] === "retry") {
    return json({ paymentId: segments[2], status: "RETRY_REQUESTED", acceptedAt: now }, 202);
  }

  if (method === "DELETE" && segments[0] === "billing" && segments[1] === "payments" && segments[2]) {
    return noContent();
  }

  if (method === "GET" && path === "billing/subscriptions") {
    return json({ subscriptions: billingSubscriptions.map(apiSubscription) });
  }

  if (method === "DELETE" && segments[0] === "billing" && segments[1] === "subscriptions" && segments[2]) {
    return noContent();
  }

  if (method === "GET" && path === "billing/payment-failures") {
    return json({ failures: failedBilling.map(apiFailure) });
  }

  if (method === "GET" && path === "billing/plans") {
    return json({ plans: planCards.map(apiPlan) });
  }

  if (method === "PATCH" && segments[0] === "billing" && segments[1] === "plans" && segments[2]) {
    const body = await request.json().catch(() => ({ price: 0, applyTiming: "IMMEDIATE" }));
    const plan = planCards.find((item) => item.key === segments[2]);
    return json({ ...(plan ? apiPlan(plan) : { planId: segments[2], name: segments[2], currency: "KRW" }), price: body.price, effectiveAt: now });
  }

  if (method === "POST" && path === "auth/login") {
    const body = await request.json().catch(() => ({ loginId: "", password: "" }));
    const account = mockAdminAccounts.find((item) => item.loginId === body.loginId && item.password === body.password);
    if (!account) {
      return Response.json({ error: { code: "INVALID_CREDENTIALS", message: "아이디 또는 비밀번호가 일치하지 않습니다." } }, { status: 401 });
    }
    account.lastLoginAt = now;
    return json({
      accessToken: `mock-token-${account.adminId}`,
      admin: { ...adminProfile, ...apiAdminAccount(account), adminUserId: account.adminId }
    });
  }

  if (method === "GET" && path === "admin-accounts") {
    return json({ admins: mockAdminAccounts.map(apiAdminAccount) });
  }

  if (method === "POST" && path === "admin-accounts") {
    const body = await request.json().catch(() => ({ name: "", loginId: "", role: "admin" }));
    if (mockAdminAccounts.some((item) => item.loginId === body.loginId)) {
      return Response.json({ error: { code: "CONFLICT", message: "이미 사용 중인 아이디입니다." } }, { status: 409 });
    }
    const temporaryPassword = generateMockPassword();
    const account: MockAdminAccount = {
      adminId: `adm_${Date.now()}`,
      name: body.name,
      loginId: body.loginId,
      password: temporaryPassword,
      role: body.role,
      mustChangePassword: true,
      createdAt: now,
      lastLoginAt: null
    };
    mockAdminAccounts.push(account);
    return json({ admin: apiAdminAccount(account), temporaryPassword }, 201);
  }

  if (method === "DELETE" && segments[0] === "admin-accounts" && segments[1]) {
    const index = mockAdminAccounts.findIndex((item) => item.adminId === segments[1]);
    if (index >= 0) {
      mockAdminAccounts.splice(index, 1);
    }
    return noContent();
  }

  if (method === "PATCH" && segments[0] === "admin-accounts" && segments[1]) {
    const account = mockAdminAccounts.find((item) => item.adminId === segments[1]);
    if (!account) {
      return Response.json({ error: { code: "NOT_FOUND", message: "관리자 계정을 찾을 수 없습니다." } }, { status: 404 });
    }
    const body = await request.json().catch(() => ({} as { loginId?: string; name?: string; role?: AdminRole }));
    if (body.loginId && mockAdminAccounts.some((item) => item.loginId === body.loginId && item.adminId !== account.adminId)) {
      return Response.json({ error: { code: "CONFLICT", message: "이미 사용 중인 아이디입니다." } }, { status: 409 });
    }
    if (typeof body.loginId === "string") account.loginId = body.loginId;
    if (typeof body.name === "string") account.name = body.name;
    if (body.role) account.role = body.role;
    return json({ admin: apiAdminAccount(account) });
  }

  if (method === "GET" && path === "me") {
    return json(adminProfile);
  }

  if (method === "PATCH" && path === "me/profile") {
    const body = await request.json().catch(() => ({}));
    return json({ ...adminProfile, ...body });
  }

  if (method === "PATCH" && path === "me/password") {
    return noContent();
  }

  return Response.json({ error: { code: "NOT_FOUND", message: `Mock admin route not found: ${method} ${path}` } }, { status: 404 });
}
