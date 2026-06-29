"use client";

import { CreditCard, LayoutDashboard, MessageSquare, Shield, Users } from "lucide-react";
import type { AdminProfile, AdminRole, Screen } from "@/lib/admin-data";

export type SidebarTarget = Screen | "admins";

const roleLabel: Record<AdminRole, string> = {
  owner: "최고관리자",
  admin: "관리자",
  support: "문의 담당",
  billing: "결제 담당"
};

export function AdminSidebar({
  admin,
  activeTarget,
  onNavigate,
  supportBadge,
  billingBadge
}: {
  admin: AdminProfile;
  activeTarget: SidebarTarget | null;
  onNavigate: (target: SidebarTarget) => void;
  supportBadge?: number;
  billingBadge?: number;
}) {
  const initial = admin.name.trim().charAt(0) || "A";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.4px", color: "#fff" }}>BrainX</div>
          <div style={{ marginTop: 1, color: "#a8a29e", fontSize: 10.5, fontWeight: 600, letterSpacing: 1 }}>ADMIN CONSOLE</div>
        </div>
      </div>

      <div className="sidebar-profile">
        <div className="sidebar-profile-head">
          <div className="sidebar-avatar">{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.name}</div>
            <div style={{ color: "#9ca3af", fontSize: 11.5, fontWeight: 500 }}>{roleLabel[admin.role]}</div>
          </div>
        </div>
        <div className="sidebar-profile-note">프로필 설정은 우측 패널에서 관리해요.</div>
      </div>

      <div className="nav-title">주요 메뉴</div>
      <nav className="nav">
        <NavButton icon={<LayoutDashboard size={19} />} label="모니터링" active={activeTarget === "dashboard"} onClick={() => onNavigate("dashboard")} live />
        <NavButton icon={<Users size={19} />} label="사용자 관리" active={activeTarget === "users"} onClick={() => onNavigate("users")} />
        <NavButton icon={<MessageSquare size={19} />} label="문의 관리" active={activeTarget === "support"} onClick={() => onNavigate("support")} badge={supportBadge} />
        <NavButton icon={<CreditCard size={19} />} label="결제 관리" active={activeTarget === "billing"} onClick={() => onNavigate("billing")} badge={billingBadge} />
        {admin.role === "owner" ? <NavButton icon={<Shield size={19} />} label="관리자 관리" active={activeTarget === "admins"} onClick={() => onNavigate("admins")} /> : null}
      </nav>

      <div className="status-box">
        <div style={{ marginBottom: 8, color: "#cbd5e1", fontSize: 11, fontWeight: 600 }}>시스템 상태</div>
        <StatusLine color="#f59e0b" text="AI-Service 응답 지연" />
        <StatusLine color="#22c55e" text="전체 서비스 정상" />
      </div>
    </aside>
  );
}

export function NavButton({ icon, label, active, onClick, badge, live }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number; live?: boolean }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {live ? <span className="dot" style={{ background: "#22c55e", animation: "pulse 2s infinite" }} /> : null}
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  );
}

export function StatusLine({ color, text }: { color: string; text: string }) {
  return (
    <div className="status-line" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, color: "#e5e7eb", fontSize: 12.5 }}>
      <span className="dot" style={{ background: color }} />
      <span>{text}</span>
    </div>
  );
}
