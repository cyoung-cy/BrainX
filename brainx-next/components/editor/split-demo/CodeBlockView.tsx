"use client";

import { useState, useRef, useEffect, useMemo, KeyboardEvent } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Copy, Check, ChevronDown, Search, FileText } from "lucide-react";
import { cx } from "@/lib/utils";

const ALL_LANGS = [
  { id: "",            label: "Plain Text" },
  // 웹
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "html",       label: "HTML" },
  { id: "css",        label: "CSS" },
  { id: "scss",       label: "SCSS" },
  { id: "json",       label: "JSON" },
  { id: "xml",        label: "XML" },
  { id: "graphql",    label: "GraphQL" },
  // 백엔드
  { id: "java",       label: "Java" },
  { id: "python",     label: "Python" },
  { id: "go",         label: "Go" },
  { id: "rust",       label: "Rust" },
  { id: "c",          label: "C" },
  { id: "cpp",        label: "C++" },
  { id: "csharp",     label: "C#" },
  { id: "php",        label: "PHP" },
  { id: "ruby",       label: "Ruby" },
  { id: "kotlin",     label: "Kotlin" },
  { id: "swift",      label: "Swift" },
  { id: "scala",      label: "Scala" },
  { id: "dart",       label: "Dart" },
  // 데이터
  { id: "sql",        label: "SQL" },
  { id: "yaml",       label: "YAML" },
  { id: "toml",       label: "TOML" },
  // 인프라
  { id: "bash",       label: "Bash" },
  { id: "shell",      label: "Shell" },
  { id: "dockerfile", label: "Dockerfile" },
  // 기타
  { id: "markdown",   label: "Markdown" },
  { id: "latex",      label: "LaTeX" },
  { id: "r",          label: "R" },
  { id: "lua",        label: "Lua" },
];

// 언어 ID → 기본 파일 확장자 (filename이 비어있을 때 자동 삽입)
const LANG_EXT: Record<string, string> = {
  java: ".java",
  javascript: ".js",
  typescript: ".ts",
  tsx: ".tsx",
  html: ".html",
  css: ".css",
  scss: ".scss",
  python: ".py",
  sql: ".sql",
  json: ".json",
  yaml: ".yml",
  markdown: ".md",
  bash: ".sh",
  shell: ".sh",
  kotlin: ".kt",
  c: ".c",
  cpp: ".cpp",
  csharp: ".cs",
  go: ".go",
  rust: ".rs",
  php: ".php",
  ruby: ".rb",
  xml: ".xml",
  swift: ".swift",
  scala: ".scala",
  dart: ".dart",
  lua: ".lua",
  r: ".r",
  graphql: ".graphql",
};

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied]               = useState(false);
  const [open, setOpen]                   = useState(false);
  const [search, setSearch]               = useState("");
  const [focusIdx, setFocusIdx]           = useState(0);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [fileDraft, setFileDraft]         = useState("");

  const dropRef          = useRef<HTMLDivElement>(null);
  const searchRef        = useRef<HTMLInputElement>(null);
  const listRef          = useRef<HTMLDivElement>(null);
  const fileRef          = useRef<HTMLInputElement>(null);
  const posAtStartRef    = useRef(false);  // auto-extension 삽입 시 커서를 맨 앞으로

  const lang      = (node.attrs.language as string) || "";
  const filename  = (node.attrs.filename  as string) || "";
  const langLabel = ALL_LANGS.find((l) => l.id === lang)?.label ?? (lang || "Plain Text");

  const filtered = useMemo(
    () =>
      search.trim()
        ? ALL_LANGS.filter(
            (l) =>
              l.label.toLowerCase().includes(search.toLowerCase()) ||
              l.id.toLowerCase().includes(search.toLowerCase())
          )
        : ALL_LANGS,
    [search]
  );

  // 드롭다운 열릴 때: 검색 초기화 + input 포커스
  useEffect(() => {
    if (open) {
      setSearch("");
      setFocusIdx(lang ? Math.max(ALL_LANGS.findIndex((l) => l.id === lang), 0) : 0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, lang]);

  // 파일명 편집 시작 시 input 포커스 + auto-extension 삽입 시 커서 맨 앞 위치
  useEffect(() => {
    if (!isEditingFile) return;
    requestAnimationFrame(() => {
      fileRef.current?.focus();
      if (posAtStartRef.current) {
        fileRef.current?.setSelectionRange(0, 0);
        posAtStartRef.current = false;
      }
    });
  }, [isEditingFile]);

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // focusIdx 변경 시 스크롤
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[focusIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

  function select(id: string) {
    updateAttributes({ language: id });
    setOpen(false);
  }

  function onLangKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[focusIdx]) select(filtered[focusIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  function onSearchChange(v: string) {
    setSearch(v);
    setFocusIdx(0);
  }

  function copy() {
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startEditFile() {
    if (!filename && lang && LANG_EXT[lang]) {
      // 파일명 없고 언어 설정된 경우: 확장자만 자동 삽입, 커서는 확장자 앞에
      setFileDraft(LANG_EXT[lang]);
      posAtStartRef.current = true;
    } else {
      setFileDraft(filename);
      posAtStartRef.current = false;
    }
    setIsEditingFile(true);
  }

  function commitFile() {
    const trimmed = fileDraft.trim();
    updateAttributes({ filename: trimmed || null });
    setIsEditingFile(false);
  }

  function cancelFile() {
    setIsEditingFile(false);
  }

  function onFileKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter")  { e.preventDefault(); commitFile(); }
    if (e.key === "Escape") { e.preventDefault(); cancelFile(); }
  }

  return (
    <NodeViewWrapper className="split-code-block my-3 rounded-xl overflow-visible border border-line/35">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        contentEditable={false}
        className="group/cb-header flex items-center gap-2 px-3 select-none"
        style={{
          height: 38,
          background: "rgb(var(--surface2))",
          borderBottom: "1px solid rgb(var(--line) / 0.3)",
          borderRadius: "0.75rem 0.75rem 0 0",
        }}
      >
        {/* LEFT: 파일명 (편집 중일 때는 헤더에서 비움 — 아래 입력창 사용) */}
        <div className="flex flex-1 items-center min-w-0">
          {isEditingFile ? (
            /* 편집 중: 헤더에는 작은 안내 텍스트만 */
            <span className="text-[11px] font-mono text-txt3 select-none px-1.5">파일명 편집 중...</span>
          ) : filename ? (
            /* 파일명 있음: 표시 + 클릭으로 수정 */
            <button
              onMouseDown={(e) => { e.preventDefault(); startEditFile(); }}
              title="클릭하여 파일명 수정"
              className="flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-mono text-txt2 hover:bg-surface/70 hover:text-txt transition-colors"
            >
              <FileText size={10} className="shrink-0 opacity-60" />
              <span className="truncate">{filename}</span>
            </button>
          ) : (
            /* 파일명 없음: hover 시 "파일명 추가" 버튼 */
            <button
              onMouseDown={(e) => { e.preventDefault(); startEditFile(); }}
              title="파일명 추가"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono text-txt3 opacity-0 group-hover/cb-header:opacity-100 hover:bg-surface/70 hover:text-txt2 transition-all"
            >
              <FileText size={10} className="shrink-0" />
              <span>파일명 추가</span>
            </button>
          )}
        </div>

        {/* RIGHT: 언어 선택 + 복사 + 삭제 */}
        <div className="flex items-center gap-0.5 shrink-0">

          {/* 언어 드롭다운 */}
          <div ref={dropRef} className="relative">
            <button
              onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
              className={cx(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-mono transition-colors",
                open
                  ? "bg-primary/15 text-primary"
                  : "text-txt2 hover:bg-surface/70 hover:text-txt"
              )}
            >
              <span>{langLabel}</span>
              <ChevronDown
                size={9}
                className={cx("shrink-0 transition-transform duration-150", open && "rotate-180")}
              />
            </button>

            {open && (
              <div
                className="absolute right-0 top-full z-[200] mt-1.5 w-48 rounded-xl overflow-hidden"
                style={{
                  background: "rgb(var(--surface))",
                  border: "1.5px solid rgb(var(--line) / 0.45)",
                  boxShadow:
                    "0 4px 6px -1px rgba(0,0,0,0.15), 0 10px 28px -4px rgba(0,0,0,0.2)",
                }}
              >
                {/* 검색 영역 */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{
                    background: "rgb(var(--surface2))",
                    borderBottom: "1px solid rgb(var(--line) / 0.35)",
                  }}
                >
                  <Search size={12} className="shrink-0 text-txt3" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={onLangKeyDown}
                    placeholder="언어 검색..."
                    className="flex-1 min-w-0 bg-transparent text-[12px] text-txt outline-none placeholder:text-txt3/70"
                    style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                  />
                </div>

                {/* 언어 목록 */}
                <div
                  ref={listRef}
                  className="split-code-lang-list overflow-y-auto py-1"
                  style={{ maxHeight: 240 }}
                >
                  {filtered.length === 0 && (
                    <div className="px-4 py-3 text-[11px] text-txt3">결과 없음</div>
                  )}
                  {filtered.map((l, idx) => (
                    <button
                      key={l.id}
                      onMouseDown={(e) => { e.preventDefault(); select(l.id); }}
                      className={cx(
                        "flex w-full items-center justify-between px-4 py-[7px] text-left text-[12px] transition-colors",
                        idx === focusIdx
                          ? "bg-primary/12 text-primary"
                          : l.id === lang
                          ? "bg-primary/6 text-primary"
                          : "text-txt2 hover:bg-surface2/70 hover:text-txt"
                      )}
                      style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                    >
                      <span>{l.label}</span>
                      {l.id === lang && (
                        <Check size={10} className="shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 복사 버튼 (아이콘만, tooltip으로 피드백) */}
          <button
            onMouseDown={(e) => { e.preventDefault(); copy(); }}
            title={copied ? "복사됨!" : "코드 복사"}
            className={cx(
              "flex items-center rounded-md p-1.5 transition-colors",
              copied
                ? "text-green-400"
                : "text-txt3 hover:bg-surface/70 hover:text-txt"
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* ── 파일명 편집창 (Plan B: 헤더 아래 전폭) ──────────────────── */}
      {isEditingFile && (
        <div
          contentEditable={false}
          className="flex items-center gap-2 px-3"
          style={{
            height: 34,
            background: "rgb(var(--surface2) / 0.7)",
            borderBottom: "1px solid rgb(var(--line) / 0.25)",
          }}
        >
          <FileText size={11} className="shrink-0 text-txt3" />
          <input
            ref={fileRef}
            value={fileDraft}
            onChange={(e) => setFileDraft(e.target.value)}
            onBlur={commitFile}
            onKeyDown={onFileKeyDown}
            placeholder="파일명 입력 (예: Main.java)"
            className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-txt outline-none placeholder:text-txt3/60"
          />
          <span className="shrink-0 text-[10px] text-txt3/70 select-none">Enter 확인 · Esc 취소</span>
        </div>
      )}

      {/* ── 코드 내용 ────────────────────────────────────────────────── */}
      <pre
        style={{
          margin: 0,
          padding: "1rem 1.25rem",
          overflowX: "auto",
          background: "rgb(var(--surface2) / 0.4)",
          lineHeight: 1.75,
          fontSize: "12px",
          fontFamily: "var(--font-mono, ui-monospace, 'Cascadia Code', monospace)",
          borderRadius: "0 0 0.75rem 0.75rem",
        }}
      >
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}
