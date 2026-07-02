"use client";

import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import React, { useEffect, useRef, useState } from "react";

const TOGGLE_SUMMARY_PLACEHOLDER = "토글";
/* 새로 만든 형제 토글의 제목 입력창에 자동으로 포커스를 주기 위한 신호 — 마운트 시 1회만 소비된다. */
const AUTO_FOCUS_ATTR = "autoFocusSummary";
/* Backspace로 토글 밖 ↔ 제목 사이를 오갈 때(addKeyboardShortcuts, ProseMirror 레벨)가 이 이벤트를
   쏘고, 같은 pos를 가진 ToggleNodeView(React 레벨, 제목은 문서 content가 아니라 여기서만 관리)가
   받아서 제목 편집 모드로 되돌아간다 — 두 세계(문서 content ↔ NodeView 로컬 상태) 사이의 다리.
   editor.view.dom(이 에디터 인스턴스 자신)에만 쏘고 들어서 화면분할 중 다른 패널과 섞이지 않는다. */
const FOCUS_TITLE_EVENT = "brainx-toggle-focus-title";

/* ── React 뷰 컴포넌트 ────────────────────────────────── */

function ToggleNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const isOpen = (node.attrs.open as boolean) ?? true;
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState<string>((node.attrs.summary as string) ?? "");
  const summary = (node.attrs.summary as string) ?? "";
  const inputRef = useRef<HTMLInputElement>(null);
  /* 최신 summary를 ref로도 들고 있는다 — FOCUS_TITLE_EVENT 리스너가 이 값을 읽을 때 deps 배열에
     summary를 넣지 않아도 되게 하기 위함(아래 두 번째 useEffect 참고). */
  const summaryRef = useRef(summary);
  summaryRef.current = summary;

  const toggleOpen = () => updateAttributes({ open: !isOpen });

  /* 제목 입력창을 열고 실제 브라우저 포커스까지 가져온다 — 커서를 텍스트 끝에 둔다.
     input의 `autoFocus` prop만으로는 이 NodeView가 setTimeout 등 React 커밋 바깥의 타이밍에
     마운트/갱신될 때 실제 포커스가 보장되지 않는 경우가 있었다(화면에는 입력창이 보이지만
     실제로는 포커스가 없어 바로 타이핑이 안 되는 문제) — ref로 직접 focus()/setSelectionRange()를
     호출해 확실하게 포커스를 가져온다. */
  const focusTitleInput = (draft: string) => {
    setSummaryDraft(draft);
    setEditingSummary(true);
    // setTimeout(0)으로 다음 매크로태스크까지 미룬다 — requestAnimationFrame은 이 커밋 직후
    // 바로 실행되지 않아 포커스가 안 잡히는 경우가 있었다(실제 확인됨).
    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
  };

  /* 방금 Enter로 생성된 형제 토글이면 마운트 직후 곧바로 제목 편집 모드로 연다(Notion처럼 다음 줄에
     새 토글이 생기자마자 바로 타이핑할 수 있게). 1회성 신호라 소비 즉시 attrs에서 지운다. */
  useEffect(() => {
    if (node.attrs[AUTO_FOCUS_ATTR]) {
      focusTitleInput("");
      // updateAttributes를 마운트 effect에서 곧바로 호출하면 ReactNodeViewRenderer가 내부적으로
      // 쓰는 flushSync가 "렌더링 중 flushSync 호출" 경고를 일으킨다(React가 이 컴포넌트를 막
      // 커밋하는 도중이라). 다음 매크로태스크로 미뤄서 커밋이 끝난 뒤에 반영한다.
      const timer = setTimeout(() => updateAttributes({ [AUTO_FOCUS_ATTR]: false }), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Backspace로 토글 밖 ↔ 제목 사이를 오갈 때 이 토글이 대상이면 제목 편집 모드로 복귀한다.
     summaryRef를 쓰므로 deps를 항상 []로 고정할 수 있다(다른 effect와 deps 배열 길이를 맞춰,
     ReactNodeViewRenderer 환경에서 나던 "useEffect deps 배열 크기가 렌더마다 다르다" React 경고를
     피한다). 이벤트는 ProseMirror 키보드 단축키 처리(=React가 관리하는 keydown) 도중 동기적으로
     dispatch되므로, 여기서 곧바로 setState를 하면 "렌더링 중 flushSync 호출" 에러가 났었다 —
     setTimeout으로 한 틱 미뤄 현재 커밋이 끝난 뒤에 안전하게 반영한다. */
  useEffect(() => {
    const target = editor.view.dom;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ pos: number }>).detail;
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (typeof pos !== "number" || detail.pos !== pos) return;
      setTimeout(() => {
        focusTitleInput(summaryRef.current);
      }, 0);
    };
    target.addEventListener(FOCUS_TITLE_EVENT, handler);
    return () => target.removeEventListener(FOCUS_TITLE_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 토글을 일반 문단으로 되돌린다(제목이 비어있는 상태에서 Enter/Backspace 공통 처리).
     제목 <input>은 문서 content가 아니라 별도 DOM 엘리먼트라, tr.setSelection만으로는 ProseMirror의
     "내부" selection 모델만 바뀔 뿐 실제 브라우저 포커스는 그대로 input(곧 사라질) 쪽에 남아있다 —
     그래서 토글은 사라졌는데 커서가 살아있지 않은(바로 타이핑이 안 되는) 문제가 있었다.
     트랜잭션 적용 후 editor.commands.focus(pos)로 실제 DOM 포커스까지 에디터로 가져온다. input이
     언마운트되는 렌더가 끝난 다음 프레임에 실행해, 언마운트 중인 input의 blur 핸들러와 겹치지 않게 한다. */
  const convertToParagraph = () => {
    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos !== "number") return;
    const applied = editor
      .chain()
      .command(({ tr }) => {
        const current = tr.doc.nodeAt(pos);
        if (!current) return false;
        tr.replaceWith(pos, pos + current.nodeSize, editor.schema.nodes.paragraph.create());
        return true;
      })
      .run();
    if (!applied) return;
    setTimeout(() => {
      editor.commands.focus(pos + 1);
    }, 0);
  };

  /* 제목에서 Enter → (Notion처럼) 토글 밖으로 나가거나 본문으로 이동하는 게 아니라, 바로 아래에
     같은 레벨의 새 토글을 하나 더 만든다. 제목이 비어있으면 대신 일반 문단으로 되돌린다. */
  const handleSummaryEnter = () => {
    const trimmed = summaryDraft.trim();
    setEditingSummary(false);

    if (trimmed === "") {
      convertToParagraph();
      return;
    }

    updateAttributes({ summary: trimmed });
    setSummaryDraft(trimmed);

    const pos = typeof getPos === "function" ? getPos() : undefined;
    if (typeof pos !== "number") return;
    const currentNode = editor.state.doc.nodeAt(pos);
    if (!currentNode) return;
    const insertPos = pos + currentNode.nodeSize;
    editor
      .chain()
      .insertContentAt(insertPos, {
        type: "toggleNode",
        // Enter로 이어서 만드는 다음 토글은 접힌 상태로 시작한다(제목만 빠르게 연달아 입력하는
        // 리스트형 흐름 — 본문을 열어둔 채로 시작하면 오히려 다음 줄로 밀려 헷갈린다).
        attrs: { open: false, summary: "", [AUTO_FOCUS_ATTR]: true },
        content: [{ type: "paragraph" }],
      })
      .run();
  };

  const handleSummaryBlur = () => {
    setEditingSummary(false);
    const trimmed = summaryDraft.trim();
    updateAttributes({ summary: trimmed });
    setSummaryDraft(trimmed);
  };

  /* 제목이 비어있는 상태에서 Backspace → 토글을 일반 문단으로 되돌린다 */
  const handleSummaryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSummaryEnter();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSummaryDraft(summary);
      setEditingSummary(false);
    } else if (e.key === "Backspace" && summaryDraft === "") {
      e.preventDefault();
      convertToParagraph();
    }
  };

  return (
    <NodeViewWrapper as="div" className="brainx-toggle" data-open={isOpen ? "true" : "false"}>
      <div className="brainx-toggle__header" contentEditable={false}>
        <button
          type="button"
          className="brainx-toggle__chevron"
          onClick={toggleOpen}
          aria-label={isOpen ? "접기" : "펼치기"}
        >
          <span className="brainx-toggle__chevron-icon" aria-hidden="true">
            {isOpen ? "▼" : "▶"}
          </span>
        </button>

        {editingSummary && editor.isEditable ? (
          <input
            ref={inputRef}
            autoFocus
            className="brainx-toggle__summary-input"
            value={summaryDraft}
            placeholder={TOGGLE_SUMMARY_PLACEHOLDER}
            onChange={(e) => setSummaryDraft(e.target.value)}
            onBlur={handleSummaryBlur}
            onKeyDown={handleSummaryKeyDown}
          />
        ) : (
          <span
            className={summary ? "brainx-toggle__summary" : "brainx-toggle__summary brainx-toggle__summary--placeholder"}
            onClick={() => {
              if (!editor.isEditable) return;
              setSummaryDraft(summary);
              setEditingSummary(true);
            }}
          >
            {summary || TOGGLE_SUMMARY_PLACEHOLDER}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="brainx-toggle__content">
          <NodeViewContent as="div" />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/* ── TipTap Node 정의 ─────────────────────────────────── */

export const ToggleNode = Node.create({
  name: "toggleNode",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": attrs.open ? "true" : "false" }),
      },
      summary: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-summary") ?? "",
        renderHTML: (attrs) => ({ "data-summary": attrs.summary ?? "" }),
      },
      /* 문서에 저장할 필요 없는 1회성 UI 신호 — HTML로 직렬화하지 않는다 */
      [AUTO_FOCUS_ATTR]: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },

  /* 토글 본문이 완전히 비어있을 때(자식이 빈 문단 하나뿐일 때)만 그 문단에 안내 placeholder 클래스를
     붙인다 — 일반 문서 placeholder(is-editor-empty, 문서 전체가 비었을 때만 표시)와는 별개 규칙이라
     서로 겹치지 않는다. 사용자가 입력을 시작하면(문단이 비어있지 않게 되면) 트랜잭션마다 다시 계산되어
     자동으로 사라진다. */
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("toggleNodeContentPlaceholder");
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations: (state) => {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name !== "toggleNode") return;
              if (node.childCount !== 1) return;
              const onlyChild = node.firstChild;
              if (!onlyChild || onlyChild.type.name !== "paragraph" || onlyChild.content.size > 0) return;
              const childPos = pos + 1;
              decorations.push(
                Decoration.node(childPos, childPos + onlyChild.nodeSize, {
                  class: "brainx-toggle__content-placeholder",
                })
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  /* Backspace 처리 — 커서가 빈 문단의 맨 앞일 때만 개입한다(내용이 있으면 기본 동작 그대로):
     - 토글 본문의 첫 번째 자식(첫 줄)이면 → 제목 편집 모드로 되돌아간다(Notion에서 본문 첫 줄
       맨 앞 Backspace가 토글 밖(제목)으로 나가는 것과 동일한 느낌).
     - 토글 본문의 두 번째 이후 자식이면서 "마지막" 자식이면 → 그 빈 줄을 지우고 토글 밖으로 나가
       새 일반 문단을 만든다(본문 중간의 빈 줄은 기본 병합 동작 그대로 사용 — 위 줄과 합쳐진다).
     - 토글 "바로 다음"에 오는 빈 문단(= 방금 빈 토글이 지워지고 남은 문단)이면 → 그 문단을 지우고
       바로 앞 토글의 제목 편집 모드로 돌아간다(커서는 제목 텍스트 끝) — 이게 없으면 Backspace를
       두 번 눌러야 이전 토글 제목 끝으로 이동했다(1번째는 기본 join이 토글 "본문" 쪽으로 커서를
       옮겨버려서, 사용자가 기대하는 "제목 끝"이 아니었음).
     제목 자체의 Backspace(비어있을 때 문단으로 변환)는 문서 content가 아니라 ToggleNodeView가
     소유한 React input이라 여기서 다루지 않는다. */
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor;
        const { selection, schema } = state;
        const { $from, empty } = selection;
        if (!empty) return false;
        if ($from.parentOffset !== 0) return false;

        const currentParagraph = $from.parent;
        if (currentParagraph.type.name !== "paragraph" || currentParagraph.content.size > 0) return false;

        const paragraphDepth = $from.depth;
        const parentDepth = paragraphDepth - 1;
        if (parentDepth < 0) return false;

        const parent = $from.node(parentDepth);
        const indexInParent = $from.index(parentDepth);

        /* Case A: 이 빈 문단이 toggleNode의 자식(본문 내부)인 경우 */
        if (parent.type.name === this.name) {
          const toggleNode = parent;
          const togglePos = $from.before(parentDepth);

          if (indexInParent === 0) {
            this.editor.view.dom.dispatchEvent(new CustomEvent(FOCUS_TITLE_EVENT, { detail: { pos: togglePos } }));
            return true;
          }

          const isLastChild = indexInParent === toggleNode.childCount - 1;
          if (!isLastChild) return false;

          const toggleEndPos = togglePos + toggleNode.nodeSize;
          const paraStart = $from.before(paragraphDepth);
          const paraEnd = $from.after(paragraphDepth);

          return this.editor
            .chain()
            .command(({ tr }) => {
              tr.delete(paraStart, paraEnd);
              const insertAt = toggleEndPos - (paraEnd - paraStart);
              tr.insert(insertAt, schema.nodes.paragraph.create());
              tr.setSelection(TextSelection.create(tr.doc, insertAt + 1));
              return true;
            })
            .run();
        }

        /* Case B: 이 빈 문단의 바로 앞 형제가 toggleNode인 경우(빈 토글이 막 지워지고 남은 문단) */
        if (indexInParent === 0) return false;
        const prevSibling = parent.child(indexInParent - 1);
        if (prevSibling.type.name !== this.name) return false;

        const paraStart = $from.before(paragraphDepth);
        const paraEnd = $from.after(paragraphDepth);
        const prevTogglePos = paraStart - prevSibling.nodeSize;

        const deleted = this.editor
          .chain()
          .command(({ tr }) => {
            tr.delete(paraStart, paraEnd);
            return true;
          })
          .run();
        if (deleted) {
          this.editor.view.dom.dispatchEvent(new CustomEvent(FOCUS_TITLE_EVENT, { detail: { pos: prevTogglePos } }));
        }
        return deleted;
      },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\/(?:토글|toggle)\s$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent({
              type: "toggleNode",
              // /토글로 만든 첫 토글은 기본적으로 접힌 상태로 시작한다(Notion과 동일).
              attrs: { open: false, summary: "", [AUTO_FOCUS_ATTR]: true },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
      }),
    ];
  },
});
