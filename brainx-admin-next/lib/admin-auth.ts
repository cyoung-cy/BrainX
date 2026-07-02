import type { AdminProfile, AdminRole } from "@/lib/admin-data";

export type { AdminRole };

export type AdminSession = {
  accessToken: string;
  admin: AdminProfile;
};

const STORAGE_KEY = "brainx_admin_session_v1";
const TOKEN_COOKIE_KEY = "brainx_admin_access_token";

function writeTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  writeTokenCookie(session.accessToken);
}

export function updateSessionAdmin(admin: AdminProfile) {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, admin });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  clearTokenCookie();
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function isOwner(): boolean {
  return getSession()?.admin.role === "owner";
}
