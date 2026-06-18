"use client";

import { useState } from "react";
import { X, Download, Upload, Clock, Share2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { exportNotes } from "./mockApi";

type ModalType = "history" | "export" | "import" | "share" | null;

interface Props {
  isLight: boolean;
  activeNoteId: string | null;
  activeNoteTitle: string;
}

export function useModals() {
  const [open, setOpen] = useState<ModalType>(null);
  return { open, setOpen };
}

/* ── History Mock Data ────────────────────────── */
const HISTORY_VERSIONS = [
  { version: "v18", time: "2분 전", label: "자동 저장", author: "나" },
  { version: "v17", time: "15분 전", label: "수동 저장", author: "나" },
  { version: "v16", time: "1시간 전", label: "자동 저장", author: "나" },
  { version: "v15", time: "3시간 전", label: "수동 저장", author: "나" },
  { version: "v14", time: "어제 14:30", label: "자동 저장", author: "나" },
];

/* ── Modal wrapper ────────────────────────────── */
function ModalOverlay({
  isLight,
  onClose,
  children,
}: {
  isLight: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={cx(
          "w-full max-w-lg rounded-2xl border shadow-soft",
          isLight ? "bg-white border-slate-200" : "bg-surface2 border-line/60"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  icon: Icon,
  isLight,
  onClose,
}: {
  title: string;
  icon: typeof X;
  isLight: boolean;
  onClose: () => void;
}) {
  return (
    <div className={cx("flex items-center gap-3 px-5 py-4 border-b", isLight ? "border-slate-200" : "border-line/40")}>
      <Icon size={18} className={isLight ? "text-slate-500" : "text-txt3"} />
      <span className={cx("text-[14px] font-semibold flex-1", isLight ? "text-slate-800" : "text-txt")}>{title}</span>
      <button onClick={onClose} className={isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"}>
        <X size={18} />
      </button>
    </div>
  );
}

/* ── History Modal ────────────────────────────── */
function HistoryModal({ isLight, onClose }: { isLight: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState("v18");
  const [showDiff, setShowDiff] = useState(false);

  return (
    <ModalOverlay isLight={isLight} onClose={onClose}>
      <ModalHeader title="버전 히스토리" icon={Clock} isLight={isLight} onClose={onClose} />

      <div className="flex divide-x divide-line/30" style={{ height: 320 }}>
        {/* Version list */}
        <div className="w-44 shrink-0 overflow-y-auto py-2">
          {HISTORY_VERSIONS.map((v) => (
            <button
              key={v.version}
              onClick={() => setSelected(v.version)}
              className={cx(
                "w-full text-left px-4 py-2.5 transition-colors",
                selected === v.version
                  ? isLight ? "bg-blue-50 border-r-2 border-primary" : "bg-primary/10 border-r-2 border-primary"
                  : isLight ? "hover:bg-slate-50" : "hover:bg-surface/60"
              )}
            >
              <div className={cx("text-[12px] font-semibold", isLight ? "text-slate-700" : "text-txt")}>
                {v.version}
              </div>
              <div className={cx("text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
                {v.time}
              </div>
              <div className={cx("text-[10px] mt-0.5", isLight ? "text-slate-400" : "text-txt3/70")}>
                {v.label}
              </div>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className={cx("text-[12px] font-semibold", isLight ? "text-slate-700" : "text-txt")}>{selected} 미리보기</span>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={cx(
                "ml-auto px-2 py-1 rounded text-[11px] border transition-all",
                showDiff
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : isLight ? "border-slate-200 text-slate-500" : "border-line/40 text-txt3"
              )}
            >
              Diff 보기
            </button>
          </div>
          {showDiff ? (
            <div className="space-y-1 font-mono text-[12px]">
              <div className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded">+ API Gateway 섹션 추가됨</div>
              <div className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded">- 이전 배포 계획 섹션 삭제됨</div>
              <div className={cx("px-2 py-0.5", isLight ? "text-slate-500" : "text-txt3")}>  # BrainX MSA 설계</div>
              <div className={cx("px-2 py-0.5", isLight ? "text-slate-500" : "text-txt3")}>  ## 개요</div>
            </div>
          ) : (
            <pre className={cx("text-[11px] leading-relaxed whitespace-pre-wrap", isLight ? "text-slate-600" : "text-txt2")}>
              # BrainX MSA 설계{"\n"}## 개요{"\n"}BrainX는 AI 기반 개인 지식 관리 플랫폼...
            </pre>
          )}
        </div>
      </div>

      <div className={cx("flex items-center gap-2 px-5 py-3 border-t", isLight ? "border-slate-200" : "border-line/40")}>
        <span className={cx("text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
          자동 저장: 500ms Debounce · 30일 보관
        </span>
        <button
          onClick={() => { alert(`${selected} 버전으로 롤백합니다 (목업)`); onClose(); }}
          className="ml-auto px-4 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-white hover:brightness-110"
        >
          이 버전으로 롤백
        </button>
      </div>
    </ModalOverlay>
  );
}

/* ── Export Modal ─────────────────────────────── */
function ExportModal({
  isLight,
  onClose,
  noteTitle,
}: {
  isLight: boolean;
  onClose: () => void;
  noteTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleExport(format: "markdown" | "pdf" | "html" | "obsidian-zip") {
    setLoading(true);
    await exportNotes(["current"], format);
    setDone(true);
    setLoading(false);
  }

  const formats = [
    { id: "markdown" as const, label: "Markdown (.md)", icon: "#", desc: "Obsidian 호환" },
    { id: "pdf" as const, label: "PDF", icon: "P", desc: "인쇄/공유용" },
    { id: "html" as const, label: "HTML", icon: "<>", desc: "웹 게시용" },
    { id: "obsidian-zip" as const, label: "Obsidian Vault (.zip)", icon: "⊙", desc: "Obsidian으로 이동" },
  ];

  return (
    <ModalOverlay isLight={isLight} onClose={onClose}>
      <ModalHeader title="내보내기" icon={Download} isLight={isLight} onClose={onClose} />

      <div className="p-5">
        <p className={cx("text-[13px] mb-4", isLight ? "text-slate-600" : "text-txt2")}>
          <strong>{noteTitle}</strong> 내보내기 형식을 선택하세요.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleExport(fmt.id)}
              disabled={loading}
              className={cx(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                isLight
                  ? "border-slate-200 hover:border-primary/40 hover:bg-blue-50"
                  : "border-line/40 hover:border-primary/40 hover:bg-primary/5",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cx(
                "w-9 h-9 flex items-center justify-center rounded-lg font-mono text-[13px] font-bold shrink-0",
                isLight ? "bg-slate-100 text-slate-600" : "bg-surface text-txt2"
              )}>
                {fmt.icon}
              </div>
              <div>
                <div className={cx("text-[12px] font-semibold", isLight ? "text-slate-700" : "text-txt")}>
                  {fmt.label}
                </div>
                <div className={cx("text-[10px]", isLight ? "text-slate-400" : "text-txt3")}>
                  {fmt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
        {done && (
          <div className={cx("mt-3 rounded-xl px-4 py-3 text-[13px]", isLight ? "bg-green-50 text-green-700" : "bg-green-500/10 text-green-400")}>
            ✓ 내보내기 완료! 다운로드 링크가 생성되었습니다. (목업)
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ── Import Modal ─────────────────────────────── */
function ImportModal({ isLight, onClose }: { isLight: boolean; onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const sources = [
    { id: "markdown", label: "Markdown 파일", icon: "#", accept: ".md" },
    { id: "obsidian", label: "Obsidian Vault", icon: "⊙", accept: ".zip" },
    { id: "notion", label: "Notion Export", icon: "N", accept: ".zip" },
    { id: "text", label: "일반 텍스트", icon: "T", accept: ".txt" },
  ];

  function simulateImport() {
    setImporting(true);
    const steps = [10, 30, 60, 90, 100];
    let i = 0;
    const interval = setInterval(() => {
      setProgress(steps[i]);
      i++;
      if (i >= steps.length) {
        clearInterval(interval);
        setDone(true);
        setImporting(false);
      }
    }, 600);
  }

  return (
    <ModalOverlay isLight={isLight} onClose={onClose}>
      <ModalHeader title="가져오기" icon={Upload} isLight={isLight} onClose={onClose} />

      <div className="p-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); simulateImport(); }}
          className={cx(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all mb-4",
            dragOver
              ? "border-primary/60 bg-primary/5"
              : isLight ? "border-slate-300 hover:border-slate-400" : "border-line/40 hover:border-line"
          )}
        >
          <div className="text-3xl mb-2">📂</div>
          <p className={cx("text-[13px] font-medium mb-1", isLight ? "text-slate-700" : "text-txt2")}>
            파일을 여기에 드래그하거나 클릭하여 선택
          </p>
          <p className={cx("text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
            .md, .zip (Obsidian/Notion), .txt 지원
          </p>
        </div>

        {/* Source buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={simulateImport}
              className={cx(
                "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[11px] transition-all",
                isLight
                  ? "border-slate-200 hover:border-slate-300 text-slate-600"
                  : "border-line/40 hover:border-line text-txt2"
              )}
            >
              <span className="text-[18px]">{src.icon}</span>
              <span>{src.label}</span>
            </button>
          ))}
        </div>

        {/* Progress */}
        {(importing || done) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={cx("text-[12px]", isLight ? "text-slate-600" : "text-txt2")}>
                {done ? "가져오기 완료!" : "가져오는 중..."}
              </span>
              <span className={cx("text-[12px] font-semibold", isLight ? "text-slate-700" : "text-txt")}>
                {progress}%
              </span>
            </div>
            <div className={cx("h-2 rounded-full overflow-hidden", isLight ? "bg-slate-200" : "bg-surface")}>
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {done && (
              <p className={cx("mt-2 text-[12px]", isLight ? "text-green-700" : "text-green-400")}>
                ✓ 노트 6개를 성공적으로 가져왔습니다. (목업)
              </p>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

/* ── Share Modal ──────────────────────────────── */
function ShareModal({
  isLight,
  onClose,
  noteTitle,
}: {
  isLight: boolean;
  onClose: () => void;
  noteTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<"read" | "edit">("read");
  const [expires, setExpires] = useState("7d");
  const shareUrl = `https://brainx.app/share/note-abc-demo-link-${Date.now().toString(36)}`;

  function copy() {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalOverlay isLight={isLight} onClose={onClose}>
      <ModalHeader title="공유" icon={Share2} isLight={isLight} onClose={onClose} />

      <div className="p-5 space-y-4">
        <p className={cx("text-[13px]", isLight ? "text-slate-600" : "text-txt2")}>
          <strong>{noteTitle}</strong>의 공개 링크를 생성합니다.
        </p>

        {/* Permission */}
        <div>
          <label className={cx("text-[11px] font-semibold block mb-1.5", isLight ? "text-slate-500" : "text-txt3")}>권한</label>
          <div className="flex gap-2">
            {(["read", "edit"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className={cx(
                  "px-3 py-1.5 rounded-lg text-[12px] border transition-all",
                  permission === p
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : isLight ? "border-slate-200 text-slate-500" : "border-line/40 text-txt3"
                )}
              >
                {p === "read" ? "읽기 전용" : "편집 가능"}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className={cx("text-[11px] font-semibold block mb-1.5", isLight ? "text-slate-500" : "text-txt3")}>만료</label>
          <select
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className={cx(
              "w-full px-3 py-2 rounded-lg text-[13px] border outline-none",
              isLight ? "border-slate-200 bg-white text-slate-700" : "border-line/40 bg-surface text-txt2"
            )}
          >
            <option value="1d">1일</option>
            <option value="7d">7일</option>
            <option value="30d">30일</option>
            <option value="never">만료 없음</option>
          </select>
        </div>

        {/* Share link */}
        <div className={cx("flex items-center gap-2 px-3 py-2 rounded-lg border", isLight ? "border-slate-200 bg-slate-50" : "border-line/40 bg-surface/60")}>
          <span className={cx("flex-1 text-[11px] truncate font-mono", isLight ? "text-slate-600" : "text-txt2")}>{shareUrl}</span>
          <button
            onClick={copy}
            className={cx(
              "px-2.5 py-1 rounded text-[11px] font-medium transition-all",
              copied ? "text-green-500" : isLight ? "text-primary hover:bg-blue-50" : "text-primary hover:bg-primary/10"
            )}
          >
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>

        {/* iframe embed */}
        <div>
          <label className={cx("text-[11px] font-semibold block mb-1.5", isLight ? "text-slate-500" : "text-txt3")}>iframe 임베드</label>
          <pre className={cx("text-[11px] p-2.5 rounded-lg overflow-x-auto", isLight ? "bg-slate-50 border border-slate-200 text-slate-600" : "bg-surface/60 border border-line/40 text-txt2")}>
            {`<iframe src="${shareUrl}" width="800" height="600" />`}
          </pre>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ── Main export ──────────────────────────────── */
export default function HistoryExportImportModals({
  isLight,
  activeNoteId,
  activeNoteTitle,
}: Props) {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      {/* Trigger buttons (toolbar area) */}
      <div className="flex items-center gap-1">
        {[
          { type: "history" as ModalType, label: "히스토리", icon: "⏱" },
          { type: "export" as ModalType, label: "내보내기", icon: "↗" },
          { type: "import" as ModalType, label: "가져오기", icon: "↙" },
          { type: "share" as ModalType, label: "공유", icon: "⇪" },
        ].map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => setModal(type)}
            title={label}
            className={cx(
              "flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-all",
              isLight
                ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                : "border-line/40 bg-surface/60 text-txt2 hover:border-line hover:bg-surface2"
            )}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Modals */}
      {modal === "history" && (
        <HistoryModal isLight={isLight} onClose={() => setModal(null)} />
      )}
      {modal === "export" && (
        <ExportModal
          isLight={isLight}
          onClose={() => setModal(null)}
          noteTitle={activeNoteTitle}
        />
      )}
      {modal === "import" && (
        <ImportModal isLight={isLight} onClose={() => setModal(null)} />
      )}
      {modal === "share" && (
        <ShareModal
          isLight={isLight}
          onClose={() => setModal(null)}
          noteTitle={activeNoteTitle}
        />
      )}
    </>
  );
}
