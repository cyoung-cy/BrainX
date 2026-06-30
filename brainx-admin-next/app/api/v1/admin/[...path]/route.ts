import { handleAdminMockRequest } from "@/lib/admin-mock";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const FORWARDED_REQUEST_HEADERS = ["authorization", "content-type", "accept", "idempotency-key"] as const;

function shouldUseAdminMock() {
  return process.env.NODE_ENV !== "production" && process.env.ADMIN_MOCK_ENABLED === "true";
}

async function dispatch(request: Request, context: RouteContext) {
  const params = await context.params;
  const pathSegments = params.path ?? [];

  if (shouldUseAdminMock()) {
    return handleAdminMockRequest(request, pathSegments);
  }

  const adminServiceUrl = process.env.ADMIN_SERVICE_URL ?? "http://localhost:8085";
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`/api/v1/admin/${pathSegments.join("/")}${sourceUrl.search}`, adminServiceUrl);
  const headers = new Headers();
  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store"
  });
}

export async function GET(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return dispatch(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return dispatch(request, context);
}
