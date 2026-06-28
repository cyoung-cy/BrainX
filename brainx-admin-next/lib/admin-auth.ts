import type { AdminProfile, AdminRole } from "@/lib/admin-data";

export type { AdminRole };

export type AdminSession = {
  accessToken: string;
  admin: AdminProfile;
};

const STORAGE_KEY = "brainx_admin_session_v1";

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
}

export function updateSessionAdmin(admin: AdminProfile) {
  const current = getSession();
  if (!current) return;
  setSession({ ...current, admin });
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function isOwner(): boolean {
  return getSession()?.admin.role === "owner";
}
