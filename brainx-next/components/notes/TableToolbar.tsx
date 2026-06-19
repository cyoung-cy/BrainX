"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Rows3,
  Columns3,
  Plus,
  Trash2,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { MAX_BLOCK_PERCENT, MIN_BLOCK_PERCENT, type BlockWidthMode } from "./BlockControls";
import { activeTableDisplayAttrs, updateActiveTableAttrs } from "./tableUtils";

function ToolbarBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "grid h-[26px] min-w-[26px] place-items-center rounded px-1 transition-colors",
        danger ? "text-red-400 hover:bg-red-500/10" : "text-txt2 hover:bg-surface2/70 hover:text-txt"
      )}
    >
      {children}
    </button>
  );
}

/** 표(Table) 안에 커서가 있을 때만 떠서 행/열을 추가·삭제할 수 있는 작은 툴바.
    `Table`/`TableRow`/`TableCell`은 공식 확장 자체 NodeView(순수 JS, `TableView`)를 쓰기 때문에
    Mermaid/이미지 블록처럼 React NodeView 안에 hover 툴바를 끼워넣을 수 없다 — 그래서
    `CustomBubbleMenu`와 같은 방식(selection 구독 → 좌표 계산 → `createPortal`)으로 별도의
    떠있는 툴바를 만든다. 다만 "표 안에 있는지"는 PM 모델의 조상 노드 체인을 직접 보는
    구조적 판정이라(`editor.isActive("table")`), 버블 툴바를 여러 번 고쳐야 했던 그 "native
    selection이 드래그 중 일시적으로 collapse되는" 문제에 영향받지 않는다 — settling 같은
    방어 로직 없이 단순하게 구현해도 안전하다. */
export function TableToolbar({ editor }: { editor: Editor }) {
  const [anchor, setAnchor] = useState<{ left: number; right: number; top: number; bottom: number } | null>(null);
  const [customDraft, setCustomDraft] = useState("100");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    if (!editor.isEditable || !editor.isActive("table")) {
      setAnchor(null);
      return;
    }
    const { $from } = editor.state.selection;
    let tablePos: number | null = null;
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === "table") {
        tablePos = $from.before(d);
        break;
      }
    }
    if (tablePos === null) {
      setAnchor(null);
      return;
    }
    const dom = editor.view.nodeDOM(tablePos);
    const el = dom instanceof HTMLElement ? dom : null;
    if (!el) {
      setAnchor(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setAnchor({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updateAnchor);
    editor.on("transaction", updateAnchor);
    const onBlur = () => {
      requestAnimationFrame(() => {
        if (toolbarRef.current?.contains(document.activeElement)) return;
        setAnchor(null);
      });
    };
    editor.on("blur", onBlur);
    return () => {
      editor.off("selectionUpdate", updateAnchor);
      editor.off("transaction", updateAnchor);
      editor.off("blur", onBlur);
    };
  }, [editor, updateAnchor]);

  useEffect(() => {
    if (!anchor) return;
    const onScrollOrResize = () => updateAnchor();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [anchor, updateAnchor]);

  if (!anchor) return null;

  const run = (fn: () => boolean) => () => { fn(); updateAnchor(); };
  const tableAttrs = activeTableDisplayAttrs(editor);
  const commitCustomWidth = () => {
    const next = Number(customDraft);
    if (!Number.isFinite(next) || customDraft.trim() === "") {
      setCustomDraft(String(tableAttrs.widthPercent ?? 100));
      return;
    }
    const widthPercent = Math.min(Math.max(next, MIN_BLOCK_PERCENT), MAX_BLOCK_PERCENT);
    setCustomDraft(String(widthPercent));
    updateActiveTableAttrs(editor, { widthMode: "custom", widthPercent });
  };

  return createPortal(
    <>
      <div
        ref={toolbarRef}
        style={{
          position: "fixed",
          left: Math.max(4, Math.min(anchor.right - 470, window.innerWidth - 478)),
          top: Math.max(anchor.top - 38, 4),
          zIndex: 1900,
          maxWidth: "calc(100vw - 8px)",
          overflowX: "auto",
        }}
      >
        <div
          className="flex w-max items-center gap-0.5 rounded-lg border border-line/60 px-1 py-1"
          style={{ background: "rgb(var(--surface))", boxShadow: "0 8px 20px -4px rgba(2,6,23,0.35)" }}
        >
          <select
            aria-label="표 크기"
            title="표 크기"
            value={tableAttrs.widthMode}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => updateActiveTableAttrs(editor, { widthMode: event.target.value as BlockWidthMode })}
            className="h-6 rounded border border-line/50 bg-surface px-1 text-[10.5px] text-txt2 outline-none"
          >
            <option value="fit">맞춤</option>
            <option value="original">원본</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
            <option value="custom">사용자 지정</option>
          </select>
          <input
            type="number"
            min={MIN_BLOCK_PERCENT}
            max={MAX_BLOCK_PERCENT}
            aria-label="표 사용자 지정 크기 비율"
            title="사용자 지정 비율(%)"
            value={tableAttrs.widthMode === "custom" ? customDraft : ""}
            placeholder="%"
            onFocus={() => setCustomDraft(String(tableAttrs.widthPercent ?? 100))}
            onChange={(event) => setCustomDraft(event.target.value)}
            onBlur={commitCustomWidth}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); commitCustomWidth(); }
            }}
            className="h-6 w-11 rounded border border-line/50 bg-transparent px-1 text-[10.5px] text-txt outline-none"
          />

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          <ToolbarBtn title="위에 행 추가" onClick={run(() => editor.chain().focus().addRowBefore().run())}>
            <ArrowUpToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn title="아래에 행 추가" onClick={run(() => editor.chain().focus().addRowAfter().run())}>
            <ArrowDownToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn title="행 삭제" onClick={run(() => editor.chain().focus().deleteRow().run())}>
            <Rows3 size={13} />
          </ToolbarBtn>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          <ToolbarBtn title="왼쪽에 열 추가" onClick={run(() => editor.chain().focus().addColumnBefore().run())}>
            <ArrowLeftToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn title="오른쪽에 열 추가" onClick={run(() => editor.chain().focus().addColumnAfter().run())}>
            <ArrowRightToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn title="열 삭제" onClick={run(() => editor.chain().focus().deleteColumn().run())}>
            <Columns3 size={13} />
          </ToolbarBtn>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          <ToolbarBtn title="표 삭제" danger onClick={run(() => editor.chain().focus().deleteTable().run())}>
            <Trash2 size={13} />
          </ToolbarBtn>
        </div>
      </div>

      <button
        type="button"
        title="오른쪽에 열 추가"
        aria-label="오른쪽 가장자리에서 열 추가"
        onMouseDown={(event) => event.preventDefault()}
        onClick={run(() => editor.chain().focus().addColumnAfter().run())}
        className="fixed z-[1890] grid h-6 w-6 place-items-center rounded-full border border-primary/35 bg-surface text-primary shadow-soft hover:bg-primary/10"
        style={{
          left: Math.max(4, Math.min(anchor.right - 12, window.innerWidth - 28)),
          top: Math.max(4, Math.min((anchor.top + anchor.bottom) / 2 - 12, window.innerHeight - 28)),
        }}
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        title="아래에 행 추가"
        aria-label="아래쪽 가장자리에서 행 추가"
        onMouseDown={(event) => event.preventDefault()}
        onClick={run(() => editor.chain().focus().addRowAfter().run())}
        className="fixed z-[1890] grid h-6 w-6 place-items-center rounded-full border border-primary/35 bg-surface text-primary shadow-soft hover:bg-primary/10"
        style={{
          left: Math.max(4, Math.min((anchor.left + anchor.right) / 2 - 12, window.innerWidth - 28)),
          top: Math.max(4, Math.min(anchor.bottom - 12, window.innerHeight - 28)),
        }}
      >
        <Plus size={13} />
      </button>
    </>,
    document.body
  );
}
