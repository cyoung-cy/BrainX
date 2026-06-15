"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Extension, textblockTypeInputRule } from "@tiptap/core";
import { createLowlight, all } from "lowlight";
import { Columns2, Rows2, X, ChevronDown, Maximize2, Copy, Check, Eye, Edit3, Code } from "lucide-react";
import { cx } from "@/lib/utils";
import EditorToolbar from "./EditorToolbar";
import AIAssistPanel from "./AIAssistPanel";
import type { NoteData } from "./mockData";

const lowlight = createLowlight(all);

/* ── Code block markdown shortcut ────────────── */
const MarkdownCodeFenceEnter = Extension.create({
  name: "mdCodeFenceEnter",
  priority: 150,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;
        const text = $from.parent.textContent;
        if ($from.parentOffset !== text.length) return false;
        const m = /^```([a-z]*)$/.exec(text);
        if (!m) return false;
        const lang = m[1] || null;
        const codeBlockType = this.editor.schema.nodes.codeBlock;
        if (!codeBlockType) return false;
        return this.editor.chain().command(({ tr }) => {
          tr.setNodeMarkup($from.before(), codeBlockType, { language: lang });
          tr.delete($from.pos - $from.parentOffset, $from.pos);
          return true;
        }).run();
      },
    };
  },
});

/* ── Custom Code Block NodeView ───────────────── */
function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const lang = (node.attrs.language as string) || "";
  const LANGS = ["javascript", "typescript", "java", "python", "sql", "json", "yaml", "markdown", "bash", "go", "rust", "html", "css"];

  function copy() {
    navigator.clipboard.writeText(node.textContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <NodeViewWrapper className="my-4 rounded-xl overflow-hidden border border-line/40 not-prose">
      <div contentEditable={false} className="flex items-center justify-between px-3 py-1.5 bg-surface2 border-b border-line/30 select-none">
        <select
          value={lang}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="bg-transparent text-[11px] text-txt2 outline-none cursor-pointer font-mono hover:text-txt"
        >
          <option value="">plaintext</option>
          {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex items-center gap-2">
          {lang && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{lang}</span>}
          <button onClick={copy} className={cx("flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors", copied ? "text-green-400" : "text-txt3 hover:text-txt")}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      </div>
      <pre className="m-0 p-4 overflow-x-auto bg-surface2/40 text-[13px] font-mono leading-relaxed">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

type EditorMode = "edit" | "read" | "source";

interface Props {
  note: NoteData;
  allNotes: NoteData[];
  isLight: boolean;
  isActive: boolean;
  totalPanes: number;
  canClose: boolean;
  onActivate: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onClose: () => void;
  onChangeNote: (noteId: string) => void;
  onMaximize?: () => void;
}

export default function EditorPanel({
  note,
  allNotes,
  isLight,
  isActive,
  totalPanes,
  canClose,
  onActivate,
  onSplitRight,
  onSplitDown,
  onClose,
  onChangeNote,
  onMaximize,
}: Props) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [showAI, setShowAI] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    editable: mode === "edit",
    content: noteToTipTap(note.content),
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: "내용을 입력하세요... / 로 커맨드 사용" }),
      CodeBlockLowlight.extend({
        addNodeView() { return ReactNodeViewRenderer(CodeBlockView); },
        addInputRules() {
          return [
            textblockTypeInputRule({ find: /^```([a-z]+)?[\s\n]$/, type: this.type, getAttributes: (m) => ({ language: m[1] ?? null }) }),
          ];
        },
      }).configure({ lowlight, exitOnTripleEnter: true }),
      MarkdownCodeFenceEnter,
    ],
    onSelectionUpdate({ editor: ed }) {
      const sel = ed.state.selection;
      if (!sel.empty) {
        setSelectedText(ed.state.doc.textBetween(sel.from, sel.to));
      } else {
        setSelectedText("");
      }
    },
  });

  // Update content when note changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(noteToTipTap(note.content));
    }
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update editable when mode changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(mode === "edit");
    }
  }, [editor, mode]);

  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      onClick={onActivate}
      className={cx(
        "relative flex h-full flex-col overflow-hidden transition-[border-color] duration-150",
        isActive ? "border-t-2 border-primary" : "border-t-2 border-transparent"
      )}
    >
      {/* ── Panel Header ──────────────────────── */}
      <div className={cx(
        "flex h-10 shrink-0 items-center gap-1.5 border-b border-line/50 px-2",
        isActive ? "bg-primary/[0.04]" : "bg-bg2/30"
      )}>
        {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}

        {/* Note selector */}
        <div className="relative flex min-w-0 flex-1 items-center">
          <select
            value={note.id}
            onChange={(e) => onChangeNote(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={cx(
              "flex-1 cursor-pointer appearance-none bg-transparent pr-4 text-[12px] outline-none truncate",
              isActive ? "font-medium text-txt" : "text-txt2"
            )}
          >
            {allNotes.map((n) => (
              <option key={n.id} value={n.id} className="bg-surface2 text-txt">{n.title}</option>
            ))}
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-1 text-txt3/60" />
        </div>

        {/* Mode toggle */}
        <div className={cx("flex rounded overflow-hidden border shrink-0", isLight ? "border-slate-200" : "border-line/40")}>
          {([["edit", Edit3, "편집"], ["read", Eye, "읽기"], ["source", Code, "소스"]] as const).map(([m, Icon, title]) => (
            <button
              key={m}
              title={title}
              onClick={stop(() => setMode(m))}
              className={cx(
                "p-1 transition-all",
                mode === m
                  ? "bg-primary/20 text-primary"
                  : isLight ? "text-slate-400 hover:bg-slate-100" : "text-txt3 hover:bg-surface2"
              )}
            >
              <Icon size={11} />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5">
          {selectedText && (
            <button
              title="AI 도움"
              onClick={stop(() => setShowAI((v) => !v))}
              className={cx(
                "h-6 px-1.5 rounded text-[10px] transition-all",
                showAI ? "bg-accent/20 text-accent" : isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"
              )}
            >
              ✦AI
            </button>
          )}
          <button title="오른쪽 분할" onClick={stop(onSplitRight)} className={cx("h-6 w-6 flex items-center justify-center rounded transition-all", isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-txt3/70 hover:bg-surface2/70 hover:text-txt")}>
            <Columns2 size={11} />
          </button>
          <button title="아래 분할" onClick={stop(onSplitDown)} className={cx("h-6 w-6 flex items-center justify-center rounded transition-all", isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-txt3/70 hover:bg-surface2/70 hover:text-txt")}>
            <Rows2 size={11} />
          </button>
          {onMaximize && (
            <button title="최대화" onClick={stop(onMaximize)} className={cx("h-6 w-6 flex items-center justify-center rounded transition-all", isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-txt3/70 hover:bg-surface2/70 hover:text-txt")}>
              <Maximize2 size={11} />
            </button>
          )}
          {canClose && (
            <button title="닫기" onClick={stop(onClose)} className="h-6 w-6 flex items-center justify-center rounded transition-all text-txt3/70 hover:bg-red-500/10 hover:text-red-500">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar (edit mode only) ──────────── */}
      {mode === "edit" && <EditorToolbar editor={editor} isLight={isLight} />}

      {/* ── Content ───────────────────────────── */}
      <div
        className="scroll flex-1 overflow-y-auto"
        style={{ background: isLight ? "#ffffff" : "rgb(var(--surface))" }}
      >
        {mode === "source" ? (
          <pre className={cx("p-6 text-[12px] font-mono leading-relaxed whitespace-pre-wrap", isLight ? "text-slate-700" : "text-txt2")}>
            {note.content}
          </pre>
        ) : mode === "read" ? (
          <div className="px-8 py-7">
            <NoteTitle note={note} isLight={isLight} />
            <EditorContent
              editor={editor}
              className={cx("tiptap-note-content", isLight && "tiptap-note-content--light")}
            />
          </div>
        ) : (
          <div className="px-8 py-7">
            <NoteTitle note={note} isLight={isLight} editable />
            <EditorContent
              editor={editor}
              className={cx("tiptap-note-content", isLight && "tiptap-note-content--light")}
            />
          </div>
        )}
      </div>

      {/* ── AI Assist Floating Panel ──────────── */}
      {showAI && selectedText && (
        <div className="absolute right-3 top-24 z-20">
          <AIAssistPanel
            selectedText={selectedText}
            noteTitle={note.title}
            isLight={isLight}
            onClose={() => setShowAI(false)}
            onApplyResult={(text) => {
              editor?.chain().focus().insertContent(text).run();
              setShowAI(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Note title area ──────────────────────────── */
function NoteTitle({ note, isLight, editable }: { note: NoteData; isLight: boolean; editable?: boolean }) {
  const [title, setTitle] = useState(note.title);

  useEffect(() => { setTitle(note.title); }, [note.title]);

  return (
    <div className="mb-4">
      {editable ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cx(
            "w-full text-[26px] font-bold leading-tight tracking-tight bg-transparent outline-none",
            isLight ? "text-slate-900 placeholder:text-slate-300" : "text-txt placeholder:text-txt3/50"
          )}
          placeholder="노트 제목"
        />
      ) : (
        <h1 className={cx("text-[26px] font-bold leading-tight tracking-tight", isLight ? "text-slate-900" : "text-txt")}>
          {note.title}
        </h1>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {note.tags.map((tag) => (
          <span key={tag} className={cx("text-[11px] px-2 py-0.5 rounded-full", isLight ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-primary/10 text-primary border border-primary/20")}>
            #{tag}
          </span>
        ))}
        <span className={cx("text-[11px] ml-1", isLight ? "text-slate-400" : "text-txt3")}>
          {new Date(note.updatedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 수정
        </span>
      </div>
    </div>
  );
}

/* ── Convert markdown content to TipTap JSON ──── */
function noteToTipTap(markdown: string) {
  // Build a simple ProseMirror JSON from markdown lines
  const lines = markdown.split("\n");
  const content: object[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        content.push({
          type: "codeBlock",
          attrs: { language: codeLang || null },
          content: [{ type: "text", text: codeLines.join("\n") }],
        });
        codeLines = [];
        codeLang = "";
        inCode = false;
      } else {
        codeLang = line.slice(3).trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("# ")) {
      content.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: line.slice(2) }] });
    } else if (line.startsWith("## ")) {
      content.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: line.slice(3) }] });
    } else if (line.startsWith("### ")) {
      content.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: line.slice(4) }] });
    } else if (line.startsWith("#### ")) {
      content.push({ type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: line.slice(5) }] });
    } else if (line.startsWith("> ")) {
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: line.slice(2) }] }] });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items = [line];
      while (i + 1 < lines.length && (lines[i + 1].startsWith("- ") || lines[i + 1].startsWith("* "))) {
        i++;
        items.push(lines[i]);
      }
      content.push({
        type: "bulletList",
        content: items.map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: item.slice(2) }] }],
        })),
      });
    } else if (/^\d+\.\s/.test(line)) {
      content.push({ type: "paragraph", content: [{ type: "text", text: line }] });
    } else if (line.trim() === "") {
      // skip empty lines (natural paragraph breaks)
    } else if (line.startsWith("---")) {
      content.push({ type: "horizontalRule" });
    } else {
      const textContent = parseInlineMarkdown(line);
      content.push({ type: "paragraph", content: textContent });
    }
  }

  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

function parseInlineMarkdown(line: string): object[] {
  // Simple inline markdown (bold, code) — basic only
  const parts: object[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > last) parts.push({ type: "text", text: line.slice(last, match.index) });
    if (match[0].startsWith("**")) {
      parts.push({ type: "text", text: match[2], marks: [{ type: "bold" }] });
    } else {
      parts.push({ type: "text", text: match[3], marks: [{ type: "code" }] });
    }
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push({ type: "text", text: line.slice(last) });
  return parts.length ? parts : [{ type: "text", text: line }];
}
