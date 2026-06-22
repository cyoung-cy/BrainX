"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PaintBucket,
  Plus,
  Rows3,
  Columns3,
  Trash2,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { MAX_BLOCK_PERCENT, MIN_BLOCK_PERCENT, type BlockAlign, type BlockWidthMode } from "./BlockControls";
import { QuickSwatchRow, TEXT_COLOR_QUICK } from "./ColorPalette";
import {
  activeCellAttrs,
  activeTableDisplayAttrs,
  updateActiveTableAttrs,
  updateSelectedCellsAttrs,
  type CellColorPreset,
} from "./tableUtils";

const CELL_COLOR_SWATCHES: { value: CellColorPreset; label: string; dot: string }[] = [
  { value: "yellow", label: "노랑", dot: "rgb(234 179 8)" },
  { value: "green", label: "초록", dot: "rgb(16 185 129)" },
  { value: "blue", label: "파랑", dot: "rgb(59 130 246)" },
  { value: "gray", label: "회색", dot: "rgb(148 163 184)" },
];

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
  // 버튼이 계속 늘어나(서식+색상+행/열+정렬+셀배경+삭제) 더 이상 고정폭(기존 470px 가정)이
  // 아니므로, 실제 렌더된 폭(overflow로 잘리기 전 scrollWidth)을 측정해 좌표 계산에 쓴다 —
  // 안 그러면 폭을 과소 추정해서 안전 영역(safeRight) 밖으로 오른쪽 끝이 삐져나간다.
  const [measuredWidth, setMeasuredWidth] = useState(470);
  useLayoutEffect(() => {
    if (toolbarRef.current) setMeasuredWidth(toolbarRef.current.scrollWidth);
  });

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

  // 우측 컨텍스트 패널(RightSidebar) 영역까지 툴바가 넘어가 오른쪽 끝 버튼들이 가려지는
  // 문제가 있었다 — 기존엔 window.innerWidth로만 클램프해서, 컨텍스트 패널이 차지하는
  // 폭을 고려하지 않았다. editor.view.dom(.ProseMirror)은 노트 작성 영역 자체의 DOM이라
  // 그 bounding rect는 이미 컨텍스트 패널/사이드바를 제외한 실제 안전 영역과 일치한다.
  const editorRect = editor.view.dom.getBoundingClientRect();
  const safeLeft = editorRect.left;
  const safeRight = editorRect.right;
  const safeWidth = Math.max(80, safeRight - safeLeft - 8);
  // 실제(잘리기 전) 폭과 안전 영역 중 더 좁은 쪽을 기준으로 왼쪽 좌표를 잡아야, "왼쪽 좌표 +
  // 렌더된 폭"이 항상 safeRight 이하로 맞아떨어진다(maxWidth와 같은 기준을 써야 모순이 없다).
  const effectiveWidth = Math.min(measuredWidth, safeWidth);

  const run = (fn: () => boolean) => () => { fn(); updateAnchor(); };
  const tableAttrs = activeTableDisplayAttrs(editor);
  const cellAttrs = activeCellAttrs(editor);
  const currentTextColor = (editor.getAttributes("textStyle").color as string) ?? null;
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
          left: Math.max(safeLeft + 4, Math.min(anchor.right - effectiveWidth, safeRight - effectiveWidth)),
          top: Math.max(anchor.top - 38, 4),
          zIndex: 1900,
          maxWidth: safeWidth,
          overflowX: "auto",
        }}
      >
        <div
          className="flex w-max items-center gap-0.5 rounded-lg border border-line/60 px-1 py-1"
          style={{ background: "rgb(var(--surface))", boxShadow: "0 8px 20px -4px rgba(2,6,23,0.35)" }}
        >
          {/* 표 안 텍스트 서식 — 예전엔 선택한 텍스트 위에 별도의 표 전용 Bubble Toolbar가 떴는데,
              이 항상-떠있는 TableToolbar와 동시에 보여서 두 툴바가 겹치는 문제가 있었다. 그
              Bubble Toolbar를 없애고 서식 버튼을 여기로 합쳐 표 안에서는 툴바가 하나만
              뜨도록 통일했다(CustomBubbleMenu의 분기 제거, NoteEditor.tsx 참고). */}
          <ToolbarBtn title="굵게" onClick={run(() => editor.chain().focus().toggleBold().run())}>
            <span className={cx("text-[13px] font-bold leading-none", editor.isActive("bold") && "text-primary")}>B</span>
          </ToolbarBtn>
          <ToolbarBtn title="기울임" onClick={run(() => editor.chain().focus().toggleItalic().run())}>
            <span className={cx("text-[13px] italic leading-none", editor.isActive("italic") && "text-primary")}>I</span>
          </ToolbarBtn>
          <ToolbarBtn title="취소선" onClick={run(() => editor.chain().focus().toggleStrike().run())}>
            <span className={cx("text-[13px] leading-none line-through", editor.isActive("strike") && "text-primary")}>S</span>
          </ToolbarBtn>

          {/* 텍스트 색상 — 아래 "셀 배경색"과 혼동되지 않도록 "A" 글자색 표시로 구분한다(요구사항). */}
          <span
            className="grid h-[26px] w-[14px] shrink-0 place-items-center text-[12px] font-bold leading-none"
            style={{ color: currentTextColor ?? undefined }}
            aria-hidden
          >
            A
          </span>
          <QuickSwatchRow
            swatches={TEXT_COLOR_QUICK}
            currentValue={currentTextColor}
            shape="circle"
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
          />

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

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
          {/* 행삭제/열삭제/표삭제가 전부 같은 Trash2라 구분이 안 된다는 피드백 — 행/열은 구조를
              나타내는 기존 아이콘(Rows3/Columns3)을 danger 색으로 써서 서로 구분하고, "표 전체
              삭제"만 진짜 Trash2로 남겨 의미 차이를 아이콘으로도 드러낸다. */}
          <ToolbarBtn danger title="행 삭제" onClick={run(() => editor.chain().focus().deleteRow().run())}>
            <Rows3 size={13} />
          </ToolbarBtn>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          <ToolbarBtn title="왼쪽에 열 추가" onClick={run(() => editor.chain().focus().addColumnBefore().run())}>
            <ArrowLeftToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn title="오른쪽에 열 추가" onClick={run(() => editor.chain().focus().addColumnAfter().run())}>
            <ArrowRightToLine size={13} />
          </ToolbarBtn>
          <ToolbarBtn danger title="열 삭제" onClick={run(() => editor.chain().focus().deleteColumn().run())}>
            <Columns3 size={13} />
          </ToolbarBtn>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          {/* 셀 정렬 — 단일 셀 커서/텍스트 선택, 드래그로 만든 다중 셀 CellSelection 모두 지원 */}
          {(["left", "center", "right"] as BlockAlign[]).map((a) => (
            <ToolbarBtn
              key={a}
              title={a === "left" ? "셀 왼쪽 정렬" : a === "center" ? "셀 가운데 정렬" : "셀 오른쪽 정렬"}
              onClick={run(() => updateSelectedCellsAttrs(editor, { cellAlign: a }))}
            >
              <span className={cellAttrs.align === a ? "text-primary" : undefined}>
                {a === "left" ? <AlignLeft size={13} /> : a === "center" ? <AlignCenter size={13} /> : <AlignRight size={13} />}
              </span>
            </ToolbarBtn>
          ))}

          <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

          {/* 셀 배경색 — 표 전체 색(tableColor)과 별개로 선택한 셀(들)에만 적용. 채우기 아이콘으로
              위 "A" 텍스트 색상과 구분한다(요구사항). */}
          <PaintBucket size={13} className="shrink-0 text-txt3" aria-hidden />
          {CELL_COLOR_SWATCHES.map((s) => (
            <button
              key={s.value}
              type="button"
              title={s.label}
              aria-label={`셀 배경색 ${s.label}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={run(() =>
                updateSelectedCellsAttrs(editor, {
                  cellBackground: cellAttrs.background === s.value ? "none" : s.value,
                })
              )}
              className={cx(
                "grid h-[26px] w-[26px] place-items-center rounded transition-colors",
                cellAttrs.background === s.value ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-surface2/70"
              )}
            >
              <span className="block h-3 w-3 rounded-full" style={{ background: s.dot }} />
            </button>
          ))}

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
