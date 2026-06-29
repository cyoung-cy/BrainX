"use client";

import { useEffect, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, type AdminAccountRow } from "@/lib/admin-api";
import { getSession, updateSessionAdmin } from "@/lib/admin-auth";
import type { AdminProfile, AdminRole } from "@/lib/admin-data";

const roleLabel: Record<AdminRole, string> = {
  owner: "최고관리자",
  admin: "관리자",
  support: "문의 담당",
  billing: "결제 담당"
};

const roleBadgeStyle: Record<AdminRole, { background: string; color: string }> = {
  owner: { background: "#f5f3ff", color: "#6d28d9" },
  admin: { background: "#eff6ff", color: "#1d4ed8" },
  support: { background: "#fffbeb", color: "#b45309" },
  billing: { background: "#f0fdf4", color: "#15803d" }
};

export function AdminAccountsPanel({
  currentAdmin,
  onCurrentAdminUpdated,
  onToast
}: {
  currentAdmin: AdminProfile;
  onCurrentAdminUpdated: (profile: AdminProfile) => void;
  onToast: (message: string) => void;
}) {
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<{ loginId: string; password: string } | null>(null);
  const [editingAccount, setEditingAccount] = useState<AdminAccountRow | null>(null);
  const selfAdminId = getSession()?.admin.adminUserId;

  const load = () => {
    setLoading(true);
    adminApi
      .listAdminAccounts()
      .then(setAccounts)
      .catch(() => onToast("관리자 목록을 불러오지 못했어요"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (account: AdminAccountRow) => {
    try {
      await adminApi.deleteAdminAccount(account.adminId);
      onToast(`${account.name} 관리자 계정을 삭제했어요`);
      load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "관리자 계정 삭제에 실패했어요");
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: "#78716c", fontSize: 13 }}>등록된 관리자 {accounts.length}명</div>
        <button className="btn primary" onClick={() => setCreateOpen(true)}>
          <Plus size={15} />
          관리자 생성
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>아이디</th>
              <th>이메일</th>
              <th>권한</th>
              <th>상태</th>
              <th>생성일</th>
              <th>마지막 로그인</th>
              <th style={{ textAlign: "right" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.adminId}>
                <td>
                  <b>{account.name}</b>
                </td>
                <td className="mono">{account.loginId}</td>
                <td className="mono" style={{ color: "#6b7280" }}>
                  {account.email ?? "-"}
                </td>
                <td>
                  <span className="tag" style={roleBadgeStyle[account.role]}>
                    {roleLabel[account.role]}
                  </span>
                </td>
                <td>
                  {account.mustChangePassword ? (
                    <span className="tag" style={{ background: "#fffbeb", color: "#b45309" }}>
                      보안 변경 필요
                    </span>
                  ) : (
                    <span className="tag" style={{ background: "#f0fdf4", color: "#15803d" }}>
                      정상
                    </span>
                  )}
                </td>
                <td className="mono" style={{ color: "#a8a29e" }}>
                  {account.createdAt.slice(0, 10)}
                </td>
                <td className="mono" style={{ color: "#a8a29e" }}>
                  {account.lastLoginAt ? account.lastLoginAt.slice(0, 16).replace("T", " ") : "-"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 6 }}>
                    <button
                      className="btn"
                      title="수정"
                      style={{ width: 30, height: 30, padding: 0, justifyContent: "center" }}
                      onClick={() => setEditingAccount(account)}
                    >
                      <Pencil size={14} />
                    </button>
                    {account.adminId === selfAdminId ? (
                      <span style={{ color: "#a8a29e", fontSize: 12, alignSelf: "center" }}>본인 계정</span>
                    ) : (
                      <button
                        className="btn danger"
                        title="삭제"
                        style={{ width: 30, height: 30, padding: 0, justifyContent: "center" }}
                        onClick={() => handleDelete(account)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && accounts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#a8a29e", padding: 24 }}>
                  등록된 관리자 계정이 없어요
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <CreateAdminModal
          onClose={() => setCreateOpen(false)}
          onCreated={(result) => {
            setCreateOpen(false);
            setIssuedPassword({ loginId: result.admin.loginId, password: result.temporaryPassword });
            load();
          }}
          onToast={onToast}
        />
      ) : null}

      {issuedPassword ? (
        <IssuedPasswordModal
          loginId={issuedPassword.loginId}
          password={issuedPassword.password}
          onClose={() => setIssuedPassword(null)}
          onToast={onToast}
        />
      ) : null}

      {editingAccount ? (
        <EditAdminModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={(updated) => {
            setEditingAccount(null);
            if (updated.adminId === selfAdminId) {
              const nextProfile: AdminProfile = {
                ...currentAdmin,
                adminUserId: updated.adminId,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                mustChangePassword: updated.mustChangePassword
              };
              updateSessionAdmin(nextProfile);
              onCurrentAdminUpdated(nextProfile);
            }
            load();
          }}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}

function EditAdminModal({
  account,
  onClose,
  onSaved,
  onToast
}: {
  account: AdminAccountRow;
  onClose: () => void;
  onSaved: (updated: AdminAccountRow) => void;
  onToast: (message: string) => void;
}) {
  const [name, setName] = useState(account.name);
  const [loginId, setLoginId] = useState(account.loginId);
  const [email, setEmail] = useState(account.email ?? "");
  const [role, setRole] = useState<AdminRole>(account.role);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim() || !loginId.trim()) {
      onToast("이름과 아이디를 입력해 주세요");
      return;
    }
    if (role !== "owner" && !email.trim()) {
      onToast("최고관리자를 제외한 관리자 계정에는 이메일이 필요해요");
      return;
    }

    setSubmitting(true);
    try {
      const { admin: updated } = await adminApi.updateAdminAccount(account.adminId, {
        name: name.trim(),
        loginId: loginId.trim(),
        email: email.trim() || null,
        role
      });
      onToast(`${name.trim()} 관리자 계정을 수정했어요`);
      onSaved(updated);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "관리자 수정에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="price-modal" onClick={(event) => event.stopPropagation()}>
        <h2>관리자 수정</h2>
        <label className="price-label">
          이름
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="price-label" style={{ marginTop: 12, display: "block" }}>
          아이디
          <input value={loginId} onChange={(event) => setLoginId(event.target.value.trim())} />
        </label>
        <label className="price-label" style={{ marginTop: 12, display: "block" }}>
          이메일
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@brainx.io" />
        </label>
        <div className="modal-label">권한</div>
        <select className="select" style={{ width: "100%", marginTop: 7 }} value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>
          <option value="owner">최고관리자 (owner)</option>
          <option value="admin">관리자 (admin)</option>
          <option value="support">문의 담당 (support)</option>
          <option value="billing">결제 담당 (billing)</option>
        </select>
        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button onClick={submit} disabled={submitting}>
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAdminModal({
  onClose,
  onCreated,
  onToast
}: {
  onClose: () => void;
  onCreated: (result: { admin: AdminAccountRow; temporaryPassword: string }) => void;
  onToast: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim() || !loginId.trim()) {
      onToast("이름과 아이디를 입력해 주세요");
      return;
    }
    if (role !== "owner" && !email.trim()) {
      onToast("최고관리자를 제외한 관리자 계정에는 이메일이 필요해요");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminApi.createAdminAccount({
        name: name.trim(),
        loginId: loginId.trim(),
        email: email.trim() || null,
        role
      });
      onCreated(result);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "관리자 생성에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="price-modal" onClick={(event) => event.stopPropagation()}>
        <h2>관리자 생성</h2>
        <p>임시 비밀번호는 생성 직후 한 번만 보여줍니다.</p>
        <label className="price-label">
          이름
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" />
        </label>
        <label className="price-label" style={{ marginTop: 12, display: "block" }}>
          아이디
          <input value={loginId} onChange={(event) => setLoginId(event.target.value.trim())} placeholder="admin2" />
        </label>
        <label className="price-label" style={{ marginTop: 12, display: "block" }}>
          이메일
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@brainx.io" />
        </label>
        <div className="modal-label">권한</div>
        <select className="select" style={{ width: "100%", marginTop: 7 }} value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>
          <option value="owner">최고관리자 (owner)</option>
          <option value="admin">관리자 (admin)</option>
          <option value="support">문의 담당 (support)</option>
          <option value="billing">결제 담당 (billing)</option>
        </select>
        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button onClick={submit} disabled={submitting}>
            {submitting ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssuedPasswordModal({
  loginId,
  password,
  onClose,
  onToast
}: {
  loginId: string;
  password: string;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      onToast("임시 비밀번호를 복사했어요");
    } catch {
      onToast("복사에 실패했어요. 직접 선택해서 복사해 주세요");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="price-modal" onClick={(event) => event.stopPropagation()}>
        <h2>임시 비밀번호 발급 완료</h2>
        <p>아래 비밀번호는 다시 조회할 수 없어요. 안전한 경로로 전달해 주세요.</p>
        <div className="summary-card" style={{ marginTop: 14 }}>
          <div className="summary-label">로그인 아이디</div>
          <div className="summary-value mono" style={{ fontSize: 18 }}>
            {loginId}
          </div>
          <div className="summary-label" style={{ marginTop: 14 }}>
            임시 비밀번호
          </div>
          <div className="summary-value mono" style={{ fontSize: 18, wordBreak: "break-all" }}>
            {password}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={copy}>
            <Copy size={14} />
            복사
          </button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
