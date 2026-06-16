"use client";

import React, { useState, useRef, useEffect, useCallback, MouseEvent } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Extension, textblockTypeInputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, all } from "lowlight";
import { Eye, EyeOff, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { PaneLeaf, MockNote } from "./types";
import { DropZone } from "./paneUtils";
import { HeadingFold } from "./headingFold";
import { CodeBlockView } from "./CodeBlockView";

export type EditMode = "read" | "edit";

interface Props {
  node: PaneLeaf;
  note: MockNote;
  isActive: boolean;
  totalLeaves: number;
  dragNoteId: string | null;
  mode: EditMode;
  onModeChange: (paneId: string, mode: EditMode) => void;
  onActivate: () => void;
  onClose: () => void;
  onDrop: (zone: DropZone, noteId: string) => void;
  onTitleChange: (noteId: string, newTitle: string) => void;
}

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

/* ── 메인 컴포넌트 ────────────────────────────────────────────────────── */
export default function PaneLeafView({
  node,
  note,
  isActive,
  totalLeaves,
  dragNoteId,
  mode,
  onModeChange,
  onActivate,
  onClose,
  onDrop,
  onTitleChange,
}: Props) {
  const [hoverZone, setHoverZone] = useState<DropZone | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ── 제목 편집 상태 ── */
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // note 교체 시 초기화
  useEffect(() => {
    setTitleDraft(note.title);
    setIsEditingTitle(false);
  }, [note.id, note.title]);

  // 제목 입력창 포커스
  useEffect(() => {
    if (isEditingTitle) {
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      });
    }
  }, [isEditingTitle]);

  const commitTitle = useCallback(() => {
    const t = titleDraft.trim();
    if (t && t !== note.title) onTitleChange(note.id, t);
    setTitleDraft(t || note.title);
    setIsEditingTitle(false);
  }, [titleDraft, note.title, note.id, onTitleChange]);

  const cancelTitle = useCallback(() => {
    setTitleDraft(note.title);
    setIsEditingTitle(false);
  }, [note.title]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      MarkdownLivePreview,
      MarkdownCodeFenceEnter,
      HeadingMarkerEdit,
      HeadingFold,
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
    ],
    content: markdownToHtml(note.content),
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        spellcheck: "false",
        autocomplete: "off",
        translate: "no",
      },
    },
  });

  /* note 변경 → 내용 + 모드 초기화 */
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(markdownToHtml(note.content));
    onModeChange(node.id, "read");
    editor.setEditable(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  /* mode 변경 → editable 토글 */
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(mode === "edit");
  }, [editor, mode]);

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  function getZone(e: React.DragEvent<HTMLDivElement>): DropZone {
    const el = overlayRef.current;
    if (!el) return "right";
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const dx = Math.abs(x - 0.5);
    const dy = Math.abs(y - 0.5);
    if (dx > dy) return x < 0.5 ? "left" : "right";
    return y < 0.5 ? "top" : "bottom";
  }

  const isEdit = mode === "edit";

  return (
    <div
      onClick={onActivate}
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        borderTop: `2px solid ${isActive ? "rgb(var(--primary))" : "transparent"}`,
        transition: "border-color 0.15s",
      }}
    >
      {/* ── 패널 헤더 */}
      <div
        className="flex h-10 shrink-0 items-center gap-2 border-b border-line/50 px-3"
        style={{
          background: isActive ? "rgb(var(--primary) / 0.05)" : "rgb(var(--bg2))",
        }}
      >
        {isActive && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: "rgb(var(--primary))" }}
          />
        )}

        <span
          className="min-w-0 flex-1 truncate"
          style={{
            fontSize: "13px",
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "rgb(var(--txt))" : "rgb(var(--txt2))",
          }}
        >
          {note.title}
        </span>

        <button
          onClick={stop(() => {
            // 편집 모드 → 읽기 모드 전환 시 제목 저장
            if (isEdit && isEditingTitle) commitTitle();
            onModeChange(node.id, isEdit ? "read" : "edit");
          })}
          title={isEdit ? "읽기 모드로 전환" : "편집 모드로 전환"}
          className={cx(
            "inline-flex h-[22px] w-[22px] items-center justify-center rounded transition-all",
            isEdit
              ? "text-primary hover:bg-primary/10"
              : "text-txt3/60 hover:bg-surface2/70 hover:text-txt"
          )}
        >
          {isEdit ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>

        {totalLeaves > 1 && (
          <PanelBtn onClick={stop(onClose)} title="패널 닫기" isClose>
            <X size={11} />
          </PanelBtn>
        )}
      </div>

      {/* ── 콘텐츠 */}
      <div
        className="scroll flex-1 overflow-y-auto"
        style={{ background: "rgb(var(--surface))" }}
      >
        <div className="px-8 py-7">
          {/* 노트 제목: 편집 모드에서는 클릭 → 인라인 input */}
          {isEdit && isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
                if (e.key === "Escape") { cancelTitle(); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="mb-1.5 w-full bg-transparent text-[22px] font-bold leading-tight tracking-tight text-txt outline-none"
              placeholder="제목 입력..."
            />
          ) : (
            <h1
              className={cx(
                "mb-1.5 text-[22px] font-bold leading-tight tracking-tight text-txt",
                isEdit && "cursor-text hover:text-primary/90 transition-colors"
              )}
              onClick={(e) => {
                if (!isEdit) return;
                e.stopPropagation();
                setTitleDraft(note.title);
                setIsEditingTitle(true);
              }}
              title={isEdit ? "클릭하여 제목 편집" : undefined}
            >
              {note.title}
            </h1>
          )}

          {note.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line/60 px-2.5 py-0.5 text-[11px] font-medium text-txt3"
                  style={{ background: "rgb(var(--surface2) / 0.6)" }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div
            className="split-pane-editor tiptap-note-content"
            onClick={(e) => {
              if (isEdit) e.stopPropagation();
            }}
          >
            <EditorContent editor={editor} />
          </div>

          {isEdit && (
            <p className="mt-4 text-[11px] text-txt3" style={{ opacity: 0.45 }}>
              # 제목 · - 목록 · &gt; 인용 · **굵게** · `코드` · ``` 코드블록
            </p>
          )}
        </div>
      </div>

      {/* ── DnD 오버레이 */}
      {dragNoteId !== null && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            const z = getZone(e);
            if (z !== hoverZone) setHoverZone(z);
          }}
          onDragLeave={() => setHoverZone(null)}
          onDrop={(e) => {
            e.preventDefault();
            const noteId = e.dataTransfer.getData("text/plain");
            const zone = getZone(e);
            setHoverZone(null);
            if (noteId) onDrop(zone, noteId);
          }}
        >
          {hoverZone && <SplitPreviewOverlay zone={hoverZone} />}
        </div>
      )}
    </div>
  );
}

/* ── 분할 미리보기 오버레이 */
const SPLIT_LABEL: Record<DropZone, string> = {
  left: "왼쪽에 새 패널 생성",
  right: "오른쪽에 새 패널 생성",
  top: "위에 새 패널 생성",
  bottom: "아래에 새 패널 생성",
};

const SPLIT_POS: Record<DropZone, React.CSSProperties> = {
  left:   { top: 0, left: 0, width: "50%", height: "100%" },
  right:  { top: 0, right: 0, width: "50%", height: "100%" },
  top:    { top: 0, left: 0, right: 0, height: "50%" },
  bottom: { bottom: 0, left: 0, right: 0, height: "50%" },
};

const SPLIT_DIVIDER: Record<DropZone, React.CSSProperties> = {
  left:   { position: "absolute", top: 0, right: -1, width: 2, height: "100%", background: "rgb(var(--primary))" },
  right:  { position: "absolute", top: 0, left: -1,  width: 2, height: "100%", background: "rgb(var(--primary))" },
  top:    { position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "rgb(var(--primary))" },
  bottom: { position: "absolute", top: -1,    left: 0, right: 0, height: 2, background: "rgb(var(--primary))" },
};

function SplitPreviewOverlay({ zone }: { zone: DropZone }) {
  return (
    <div
      style={{
        position: "absolute",
        background: "rgb(var(--primary) / 0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        transition: "all 0.08s ease",
        ...SPLIT_POS[zone],
      }}
    >
      <div style={SPLIT_DIVIDER[zone]} />
      <div
        style={{
          position: "relative",
          background: "rgb(var(--surface))",
          border: "1.5px solid rgb(var(--primary) / 0.45)",
          borderRadius: 8,
          padding: "5px 14px",
          fontSize: 11,
          fontWeight: 600,
          color: "rgb(var(--primary))",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-sans)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          letterSpacing: "0.01em",
        }}
      >
        {SPLIT_LABEL[zone]}
      </div>
    </div>
  );
}

/* ── 패널 헤더 버튼 */
function PanelBtn({
  children,
  onClick,
  title,
  isClose = false,
}: {
  children: React.ReactNode;
  onClick: (e: MouseEvent) => void;
  title: string;
  isClose?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={cx(
        "inline-flex h-[22px] w-[22px] items-center justify-center rounded transition-all",
        hov && isClose
          ? "bg-red-500/10 text-red-500"
          : hov
          ? "bg-surface2/70 text-txt"
          : "text-txt3/60"
      )}
    >
      {children}
    </button>
  );
}
