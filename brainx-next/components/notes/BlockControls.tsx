"use client";

import { useEffect, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cx } from "@/lib/utils";

export type BlockAlign = "left" | "center" | "right";
export type BlockWidthMode = "fit" | "original" | "50" | "75" | "100" | "125" | "150" | "custom";

export interface BlockSizeValue {
  align: BlockAlign;
  widthMode: BlockWidthMode;
  widthPercent: number | null;
}

export const MIN_BLOCK_PERCENT = 10;
export const MAX_BLOCK_PERCENT = 200;

export function blockWidthPercent(widthMode: BlockWidthMode, widthPercent: number | null) {
  if (widthMode === "fit" || widthMode === "original") return 100;
  if (widthMode === "custom") {
    return Math.min(Math.max(widthPercent ?? 100, MIN_BLOCK_PERCENT), MAX_BLOCK_PERCENT);
  }
  return Number(widthMode);
}

/** 블록 바깥 프레임 폭. 100%를 넘는 확대는 프레임을 본문 폭에 고정하고, 안쪽 콘텐츠만
    확대해 스크롤이 노트 전체가 아닌 이 프레임 안에 생기게 한다. */
export function blockWidthStyle(widthMode: BlockWidthMode, widthPercent: number | null): React.CSSProperties {
  const percent = blockWidthPercent(widthMode, widthPercent);
  return { width: `${Math.min(percent, 100)}%`, maxWidth: "100%" };
}

/** 프레임 안쪽 실제 콘텐츠 폭. 원본은 자연 크기를 유지하고, 100% 초과 프리셋은 이 요소만
    확대한다. 50/75%는 바깥 프레임 자체가 줄어들기 때문에 안쪽은 항상 프레임의 100%다. */
export function blockContentWidthStyle(
  widthMode: BlockWidthMode,
  widthPercent: number | null
): React.CSSProperties {
  if (widthMode === "original") return { width: "max-content", maxWidth: "none" };
  const percent = blockWidthPercent(widthMode, widthPercent);
  return percent > 100
    ? { width: `${percent}%`, maxWidth: "none" }
    : { width: "100%", maxWidth: "100%" };
}

export function blockJustify(align: BlockAlign): React.CSSProperties["justifyContent"] {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
}

const WIDTH_PRESETS: { mode: BlockWidthMode; label: string }[] = [
  { mode: "fit", label: "맞춤" },
  { mode: "original", label: "원본" },
  { mode: "50", label: "50%" },
  { mode: "75", label: "75%" },
  { mode: "100", label: "100%" },
  { mode: "125", label: "125%" },
  { mode: "150", label: "150%" },
];

/** Mermaid/이미지 블록 hover 시 노출되는 정렬·크기 조절 미니 툴바. contentEditable=false 영역. */
export function BlockSizeToolbar({
  value,
  onChange,
  extra,
}: {
  value: BlockSizeValue;
  onChange: (next: Partial<BlockSizeValue>) => void;
  /** 미리보기/편집 토글 등 블록별 추가 버튼 */
  extra?: React.ReactNode;
}) {
  return (
    <div
      contentEditable={false}
      className="flex items-center gap-0.5 rounded-lg border border-line/60 px-1 py-0.5 text-txt2 shadow-soft"
      style={{ background: "rgb(var(--surface))" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {(["left", "center", "right"] as BlockAlign[]).map((a) => (
        <button
          key={a}
          type="button"
          title={a === "left" ? "왼쪽 정렬" : a === "center" ? "가운데 정렬" : "오른쪽 정렬"}
          aria-label={a === "left" ? "왼쪽 정렬" : a === "center" ? "가운데 정렬" : "오른쪽 정렬"}
          onClick={() => onChange({ align: a })}
          className={cx(
            "grid h-6 w-6 place-items-center rounded transition-colors",
            value.align === a ? "bg-primary/15 text-primary" : "hover:bg-surface2/70 hover:text-txt"
          )}
        >
          {a === "left" ? <AlignLeft size={12} /> : a === "center" ? <AlignCenter size={12} /> : <AlignRight size={12} />}
        </button>
      ))}

      <div className="mx-0.5 h-4 w-px shrink-0 bg-line/50" />

      {WIDTH_PRESETS.map((p) => (
        <button
          key={p.mode}
          type="button"
          title={p.label}
          aria-label={`크기 ${p.label}`}
          onClick={() => onChange({ widthMode: p.mode })}
          className={cx(
            "rounded px-1.5 py-0.5 text-[10.5px] font-medium transition-colors",
            value.widthMode === p.mode ? "bg-primary/15 text-primary" : "hover:bg-surface2/70 hover:text-txt"
          )}
        >
          {p.label}
        </button>
      ))}

      <CustomPercentInput value={value} onChange={onChange} />

      {extra}
    </div>
  );
}

/** 사용자 지정 비율(%) 입력. 타이핑할 때마다 바로 updateAttributes를 호출하지 않고(노드뷰가
    매 키 입력마다 다시 그려지면서 이 input 자체가 포커스를 잃는 문제가 있었다 — 실측으로
    확인), 로컬 draft state만 갱신하다가 blur/Enter 시점에 한 번만 커밋한다. 기존
    `CodeBlockView`의 파일명 입력(commitFile 패턴)과 동일한 방식. */
function CustomPercentInput({
  value,
  onChange,
}: {
  value: BlockSizeValue;
  onChange: (next: Partial<BlockSizeValue>) => void;
}) {
  const committedValue = value.widthMode === "custom" ? value.widthPercent ?? 100 : "";
  const [draft, setDraft] = useState(String(committedValue));

  // 다른 곳(프리셋 버튼 등)에서 widthMode/widthPercent가 바뀌면 draft도 따라간다.
  useEffect(() => {
    setDraft(String(committedValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedValue]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim() !== "") {
      onChange({
        widthMode: "custom",
        widthPercent: Math.min(Math.max(n, MIN_BLOCK_PERCENT), MAX_BLOCK_PERCENT),
      });
    } else {
      setDraft(String(committedValue));
    }
  };

  return (
    <input
      type="number"
      min={MIN_BLOCK_PERCENT}
      max={MAX_BLOCK_PERCENT}
      title="사용자 지정 비율(%)"
      aria-label="사용자 지정 크기 비율"
      value={draft}
      placeholder="%"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        if (value.widthMode !== "custom") setDraft(String(value.widthPercent ?? 100));
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
      }}
      className="h-6 w-12 rounded border border-line/50 bg-transparent px-1 text-[10.5px] text-txt outline-none"
    />
  );
}
