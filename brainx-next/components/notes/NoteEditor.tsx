"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import { Extension, textblockTypeInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { createLowlight, all } from "lowlight";
import { Link2, Highlighter, Sparkles, Wand2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { MockNote } from "@/lib/notes/noteTypes";
import { HeadingFold } from "./headingFold";
import { CodeBlockView } from "./CodeBlockView";
import { QuickSwatchRow, MoreColorPopover, TEXT_COLOR_QUICK, HIGHLIGHT_SWATCHES } from "./ColorPalette";

export type EditMode = "read" | "edit";
export type AiActionType = "summarize" | "rewrite";

const lowlight = createLowlight(all);

/* ── Markdown → HTML (초기 로딩) ─────────────────────────────────────── */
function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineHtml(text: string) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  const codeLines: string[] = [];
  let codeLang = "";
  let listType: "ul" | "ol" | null = null;
  const listItems: string[] = [];

  function flushList() {
    if (!listType || listItems.length === 0) return;
    const tag = listType;
    out.push(
      `<${tag}>${listItems
        .map((t) => `<li><p>${inlineHtml(t)}</p></li>`)
        .join("")}</${tag}>`
    );
    listItems.length = 0;
    listType = null;
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        out.push(
          `<pre><code class="language-${codeLang}">${escHtml(
            codeLines.join("\n")
          )}</code></pre>`
        );
        codeLines.length = 0;
        codeLang = "";
        inCode = false;
      } else {
        flushList();
        codeLang = line.slice(3).trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) {
      flushList(); out.push(`<h3>${inlineHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flushList(); out.push(`<h2>${inlineHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flushList(); out.push(`<h1>${inlineHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote><p>${inlineHtml(line.slice(2))}</p></blockquote>`);
    } else {
      const olMatch = /^(\d+)\. (.+)/.exec(line);
      if (olMatch) {
        if (listType === "ul") flushList();
        listType = "ol";
        listItems.push(olMatch[2]);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        if (listType === "ol") flushList();
        listType = "ul";
        listItems.push(line.slice(2));
      } else if (line.trim() === "") {
        flushList(); out.push("<p></p>");
      } else {
        flushList(); out.push(`<p>${inlineHtml(line)}</p>`);
      }
    }
  }

  flushList();
  return out.join("");
}

/**
 * 노트 콘텐츠를 에디터에 로드할 HTML로 변환.
 * - 빈 노트: 그대로 빈 문자열 (새 노트)
 * - 이미 편집되어 HTML로 저장된 노트(에디터가 저장한 getHTML() 결과): 그대로 사용
 *   (다시 markdownToHtml을 통과시키면 태그가 텍스트로 escape되어 깨짐)
 * - 최초 시드 데이터(마크다운 원문): markdownToHtml로 변환
 */
function resolveEditorHtml(rawContent: string): string {
  const trimmed = rawContent.trim();
  if (trimmed === "") return "";
  if (trimmed.startsWith("<")) return rawContent;
  return markdownToHtml(rawContent);
}

/* ── Obsidian Live Preview ────────────────────────────────────────────── */
const LivePreviewKey = new PluginKey("livePreview");

const MarkdownLivePreview = Extension.create({
  name: "markdownLivePreview",

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        key: LivePreviewKey,
        props: {
          decorations(state) {
            if (!editor.isEditable) return DecorationSet.empty;

            const { selection, doc } = state;
            const { $from, from, to } = selection;
            const decos: Decoration[] = [];

            /* ── Heading prefix 위젯
               커서가 안에 있을 때(opacity 0.45) + 빈 heading(opacity 0.3)에 항상 표시.
               빈 heading에 marker를 보여야 Enter→split 후 시각적으로 heading이 남아 있게 됨. */
            doc.forEach((node, offset) => {
              if (node.type.name !== "heading") return;
              const level   = node.attrs.level as number;
              const nodeEnd = offset + node.nodeSize;
              const cursorInside = from > offset && to < nodeEnd;
              const isEmpty = node.textContent === "";
              if (!cursorInside && !isEmpty) return;

              const opacity = cursorInside ? 0.45 : 0.3;
              const prefix  = "#".repeat(level) + " ";
              decos.push(
                Decoration.widget(
                  offset + 1,
                  () => {
                    const s = document.createElement("span");
                    s.textContent = prefix;
                    s.style.cssText =
                      `color:rgb(var(--txt3));opacity:${opacity};font-size:inherit;` +
                      `font-weight:inherit;line-height:inherit;` +
                      `user-select:none;pointer-events:none;`;
                    return s;
                  },
                  { side: -1, key: `md-h-prefix-${offset}-${level}-${cursorInside ? 1 : 0}` }
                )
              );
              if (cursorInside) {
                decos.push(
                  Decoration.node(offset, nodeEnd, { class: "md-source-active" })
                );
              }
            });

            /* ── Blockquote prefix (커서가 있을 때만) ── */
            for (let d = $from.depth; d >= 1; d--) {
              const node = $from.node(d);
              const pos  = $from.before(d);

              if (node.type.name === "blockquote") {
                const paraPos = $from.depth > d ? $from.before(d + 1) : pos + 1;
                decos.push(
                  Decoration.widget(
                    paraPos + 1,
                    () => {
                      const s = document.createElement("span");
                      s.textContent = "> ";
                      s.style.cssText =
                        "color:rgb(var(--txt3));opacity:0.55;" +
                        "user-select:none;pointer-events:none;";
                      return s;
                    },
                    { side: -1, key: "md-bq-prefix" }
                  )
                );
                decos.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "md-source-active" })
                );
                break;
              }
            }

            /* ── 인라인 코드: 커서가 있을 때 backtick 표시 ── */
            const codeMarkType = state.schema.marks.code;
            if (
              codeMarkType &&
              $from.parent.isTextblock &&
              $from.marks().some((m) => m.type === codeMarkType)
            ) {
              const parent = $from.parent;
              const base = $from.start();
              let spanFrom = -1;
              let spanTo = -1;

              parent.forEach((child, offset) => {
                const hasCode =
                  child.isText &&
                  child.marks.some((m) => m.type === codeMarkType);
                if (hasCode) {
                  if (spanFrom === -1) spanFrom = base + offset;
                  spanTo = base + offset + child.nodeSize;
                } else if (spanFrom !== -1) {
                  // code span ended → flush
                  if ($from.pos >= spanFrom && $from.pos <= spanTo) {
                    pushCodeMarkers(decos, spanFrom, spanTo);
                  }
                  spanFrom = -1;
                  spanTo = -1;
                }
              });
              // trailing span
              if (spanFrom !== -1 && $from.pos >= spanFrom && $from.pos <= spanTo) {
                pushCodeMarkers(decos, spanFrom, spanTo);
              }
            }

            return DecorationSet.create(doc, decos);
          },
        },
      }),
    ];
  },
});

function pushCodeMarkers(
  decos: Decoration[],
  spanFrom: number,
  spanTo: number
) {
  const mk = () => {
    const s = document.createElement("span");
    s.textContent = "`";
    s.className = "md-code-marker";
    return s;
  };
  decos.push(Decoration.widget(spanFrom, mk, { side: -1, key: `mci-o-${spanFrom}` }));
  decos.push(Decoration.widget(spanTo, mk, { side: 1, key: `mci-c-${spanTo}` }));
}

/* ── ``` + Enter → code block ────────────────────────────────────────── */
// 대소문자 + alias 정규화 맵
const LANG_ALIAS: Record<string, string> = {
  js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  py: "python",
  sh: "bash", shell: "bash", zsh: "bash",
  rb: "ruby",
  kt: "kotlin",
  cs: "csharp",
  md: "markdown",
};

function normalizeLang(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return LANG_ALIAS[lower] ?? lower;
}

const MarkdownCodeFenceEnter = Extension.create({
  name: "markdownCodeFenceEnter",
  priority: 150,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.parent.type.name !== "paragraph") return false;
        const fullText = $from.parent.textContent;
        if ($from.parentOffset !== fullText.length) return false;
        // [a-zA-Z] → 대소문자 모두 허용
        const m = /^```([a-zA-Z]*)$/.exec(fullText);
        if (!m) return false;
        const lang = normalizeLang(m[1]);
        const codeBlockType = this.editor.schema.nodes.codeBlock;
        if (!codeBlockType) return false;
        return this.editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup($from.before(), codeBlockType, { language: lang });
            tr.delete($from.pos - $from.parentOffset, $from.pos);
            return true;
          })
          .run();
      },
    };
  },
});

/* ── Heading marker keyboard editing ─────────────────────────────────── */
// Backspace at heading start → 레벨 감소 (level 1이면 StarterKit에 위임)
// # at heading start (parentOffset 0) → 레벨 증가
const HeadingMarkerEdit = Extension.create({
  name: "headingMarkerEdit",
  priority: 200,

  addKeyboardShortcuts() {
    return {
      // Heading 내부 Enter → heading 유지 + 아래에 paragraph 생성 (Obsidian 방식)
      Enter: () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        if ($from.parent.type.name !== "heading") return false;
        // splitBlock → 분리된 블록을 paragraph로 변환
        return this.editor.chain().splitBlock().setNode("paragraph").run();
      },
      "#": () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parentOffset !== 0) return false;
        if ($from.parent.type.name !== "heading") return false;
        const level = $from.parent.attrs.level as number;
        if (level >= 6) return false;
        return this.editor.commands.setHeading({ level: (level + 1) as 1 | 2 | 3 | 4 | 5 | 6 });
      },
      Backspace: () => {
        const { state } = this.editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parentOffset !== 0) return false;
        if ($from.parent.type.name !== "heading") return false;
        const level = $from.parent.attrs.level as number;
        if (level <= 1) {
          // H1 커서 맨 앞 → paragraph로 변환 (joinBackward/앞줄 merge 방지)
          return this.editor.commands.setParagraph();
        }
        return this.editor.chain().setHeading({ level: (level - 1) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
      },
    };
  },
});

/* ── 버블 툴바 ─────────────────────────────────────────────────────────── */
function BubbleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cx(
        "grid h-[26px] min-w-[26px] place-items-center rounded px-1 transition-colors",
        active ? "bg-primary/15 text-primary" : "text-txt2 hover:bg-surface2/70 hover:text-txt"
      )}
    >
      {children}
    </button>
  );
}

function BubbleToolbar({
  editor,
  onAiAction,
}: {
  editor: Editor;
  onAiAction: (type: AiActionType, text: string) => void;
}) {
  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentHighlights, setRecentHighlights] = useState<string[]>([]);
  const pushRecent = (list: string[], value: string) => [value, ...list.filter((v) => v !== value)].slice(0, 4);

  const currentTextColor = (editor.getAttributes("textStyle").color as string) ?? null;
  const currentHighlight = (editor.getAttributes("highlight").color as string) ?? null;

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-line/60 px-1 py-1"
      style={{ background: "rgb(var(--surface))", boxShadow: "0 8px 20px -4px rgba(2,6,23,0.35)" }}
    >
      <BubbleBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게">
        <span className="text-[13px] font-bold leading-none">B</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임">
        <span className="text-[13px] italic leading-none">I</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄">
        <span className="text-[13px] underline leading-none">U</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선">
        <span className="text-[13px] leading-none line-through">S</span>
      </BubbleBtn>
      <BubbleBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="인라인 코드">
        <span className="text-[11px] font-mono leading-none">{"</>"}</span>
      </BubbleBtn>

      <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

      <BubbleBtn
        active={editor.isActive("link")}
        onClick={() => {
          const prev = (editor.getAttributes("link").href as string) ?? "";
          const url = window.prompt("링크 주소 입력 (빈 값이면 제거):", prev || "https://");
          if (url === null) return;
          const trimmed = url.trim();
          if (trimmed === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
          }
        }}
        title="링크"
      >
        <Link2 size={13} />
      </BubbleBtn>

      {/* 글자 색상 — 드래그 직후 바로 보이는 빠른 스와치 + 더보기(커스텀/최근) */}
      <span
        className="grid h-[26px] w-[16px] shrink-0 place-items-center text-[13px] font-bold leading-none"
        style={{ color: currentTextColor ?? undefined }}
        aria-hidden
      >
        A
      </span>
      <QuickSwatchRow
        swatches={TEXT_COLOR_QUICK}
        currentValue={currentTextColor}
        shape="circle"
        onSelect={(color) => {
          editor.chain().focus().setColor(color).run();
          setRecentTextColors((prev) => pushRecent(prev, color));
        }}
      />
      <MoreColorPopover
        title="글자 색상"
        currentValue={currentTextColor}
        recentValues={recentTextColors}
        resetLabel="기본값으로 되돌리기"
        shape="circle"
        onSelect={(color) => {
          editor.chain().focus().setColor(color).run();
          setRecentTextColors((prev) => pushRecent(prev, color));
        }}
        onReset={() => editor.chain().focus().unsetColor().run()}
      />

      <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

      {/* 형광펜 — 드래그 직후 바로 보이는 빠른 스와치 + 더보기(커스텀/최근) */}
      <Highlighter
        size={13}
        className="shrink-0"
        style={currentHighlight ? { color: currentHighlight } : undefined}
        aria-hidden
      />
      <QuickSwatchRow
        swatches={HIGHLIGHT_SWATCHES}
        currentValue={currentHighlight}
        shape="square"
        onSelect={(color) => {
          editor.chain().focus().toggleHighlight({ color }).run();
          setRecentHighlights((prev) => pushRecent(prev, color));
        }}
      />
      <MoreColorPopover
        title="형광펜"
        currentValue={currentHighlight}
        recentValues={recentHighlights}
        resetLabel="형광펜 제거"
        shape="square"
        onSelect={(color) => {
          editor.chain().focus().toggleHighlight({ color }).run();
          setRecentHighlights((prev) => pushRecent(prev, color));
        }}
        onReset={() => editor.chain().focus().unsetHighlight().run()}
      />

      <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

      <BubbleBtn
        active={false}
        onClick={() => onAiAction("summarize", getSelectedText())}
        title="AI로 요약"
      >
        <Sparkles size={13} />
      </BubbleBtn>
      <BubbleBtn
        active={false}
        onClick={() => onAiAction("rewrite", getSelectedText())}
        title="AI로 다시쓰기"
      >
        <Wand2 size={13} />
      </BubbleBtn>
    </div>
  );
}

/* ── 공통 Editor Extensions ────────────────────────────────────────────
   PaneLeafView마다 동일한 extensions 배열을 새로 만들면 StarterKit이 내장한
   link/underline과 별도 import가 다시 섞여 "Duplicate extension names" 경고가
   재발하기 쉽다. 모든 인스턴스가 이 단일 배열을 공유하도록 모듈 스코프에 한 번만
   정의한다. (link/underline은 StarterKit 내장분만 사용) */
const NOTE_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    codeBlock: false,
    link: { openOnClick: false, autolink: false },
  }),
  MarkdownLivePreview,
  MarkdownCodeFenceEnter,
  HeadingMarkerEdit,
  HeadingFold,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  CodeBlockLowlight.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        filename: {
          default: null,
          parseHTML: (el) => el.getAttribute("data-filename") ?? null,
          renderHTML: (attrs) =>
            attrs.filename ? { "data-filename": String(attrs.filename) } : {},
        },
      };
    },
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockView);
    },
    addInputRules() {
      return [
        textblockTypeInputRule({
          find: /^```([a-z]+)?[\s\n]$/,
          type: this.type,
          getAttributes: (match) => ({ language: match[1] ?? null }),
        }),
      ];
    },
    addKeyboardShortcuts() {
      return {
        // Ctrl/Cmd+A: 코드블록 내용만 전체 선택 (노트 전체 선택 방지)
        "Mod-a": () => {
          const { state } = this.editor;
          const { $from } = state.selection;
          if ($from.parent.type.name !== "codeBlock") return false;
          const from = $from.start($from.depth);
          const to   = $from.end($from.depth);
          return this.editor.commands.setTextSelection({ from, to });
        },
        // 빈 코드블록에서 Backspace → paragraph로 변환
        Backspace: () => {
          const { state } = this.editor;
          const { $from, empty } = state.selection;
          if (!empty || $from.parent.type.name !== "codeBlock") return false;
          if ($from.parent.textContent !== "") return false;
          return this.editor.commands.clearNodes();
        },
        // Escape → 코드블록 밖으로 커서 이동 (마지막 블록이면 paragraph 삽입)
        Escape: () => {
          const { state } = this.editor;
          const { $from } = state.selection;
          if ($from.parent.type.name !== "codeBlock") return false;
          // $from.depth: codeBlock 내부 depth (보통 1), after(depth)로 codeBlock 끝 다음 위치
          const afterPos = $from.after($from.depth);
          if (afterPos < state.doc.content.size) {
            // afterPos+1: 다음 노드의 첫 번째 내부 위치 (노드 경계 → 내부)
            return this.editor.commands.focus(afterPos + 1);
          }
          return this.editor
            .chain()
            .insertContentAt(afterPos, { type: "paragraph" })
            .focus(afterPos + 1)
            .run();
        },
      };
    },
  }).configure({
    lowlight,
    exitOnTripleEnter: true,
    exitOnArrowDown: true,
  }),
];

export interface NoteEditorHandle {
  focusStart: () => void;
}

interface NoteEditorProps {
  paneId: string;
  note: MockNote;
  mode: EditMode;
  onModeChange: (paneId: string, mode: EditMode) => void;
  onContentChange: (noteId: string, newContentHtml: string) => void;
  onAiAction: (type: AiActionType, text: string) => void;
}

/** TipTap 에디터 코어 — Bubble Toolbar, 색상/형광펜, 코드블록을 포함한 노트 본문 편집 영역 */
const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(function NoteEditor(
  { paneId, note, mode, onModeChange, onContentChange, onAiAction },
  ref
) {
  const contentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: NOTE_EDITOR_EXTENSIONS,
    content: resolveEditorHtml(note.content),
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        spellcheck: "false",
        autocomplete: "off",
        translate: "no",
      },
    },
    /* 본문 변경 → mock notes state로 디바운스 동기화 (탭 전환/재방문 시 내용 유지) */
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const noteId = note.id;
      if (contentSyncTimerRef.current) clearTimeout(contentSyncTimerRef.current);
      contentSyncTimerRef.current = setTimeout(() => {
        onContentChange(noteId, html);
      }, 400);
    },
  });

  useImperativeHandle(ref, () => ({
    focusStart: () => {
      editor?.chain().focus("start").run();
    },
  }), [editor]);

  /* note 변경(탭 전환 등) → 내용 갱신 + 모드 초기화.
     단, 빈 노트(새로 생성된 노트)는 바로 작성할 수 있도록 편집 모드로 연다. */
  useEffect(() => {
    if (!editor) return;
    if (contentSyncTimerRef.current) {
      clearTimeout(contentSyncTimerRef.current);
      contentSyncTimerRef.current = null;
    }
    editor.commands.setContent(resolveEditorHtml(note.content));
    const isBlankNote = note.content.trim() === "";
    onModeChange(paneId, isBlankNote ? "edit" : "read");
    editor.setEditable(isBlankNote);
    // editor를 deps에 포함: NoteEditor가 새로 마운트되는 시점(예: 빈 시작 탭 → 새 노트로 교체)에는
    // immediatelyRender:false로 인해 첫 렌더에서 editor가 아직 null이라 이 effect가 조기 종료되는데,
    // note.id만 의존하면 editor가 준비된 뒤에도 재실행되지 않아 새 노트가 영구히 읽기 모드로 고정된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, editor]);

  /* mode 변경 → editable 토글 */
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === "edit");
  }, [editor, mode]);

  /* 언마운트 시 보류 중인 디바운스 동기화 정리 */
  useEffect(() => {
    return () => {
      if (contentSyncTimerRef.current) clearTimeout(contentSyncTimerRef.current);
    };
  }, []);

  return (
    <div className="split-pane-editor tiptap-note-content" onClick={(e) => { if (mode === "edit") e.stopPropagation(); }}>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: ed, from, to }: { editor: Editor; from: number; to: number }) =>
            ed.isEditable && from !== to && !ed.isActive("codeBlock")
          }
          options={{ placement: "top", offset: 8 }}
        >
          <BubbleToolbar editor={editor} onAiAction={onAiAction} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});

export default NoteEditor;
