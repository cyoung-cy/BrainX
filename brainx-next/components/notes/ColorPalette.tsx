"use client";

import { useState, useRef, useEffect } from "react";
import { Check, RotateCcw, MoreHorizontal } from "lucide-react";
import { cx } from "@/lib/utils";

export interface ColorSwatch {
  label: string;
  value: string;
}

/* 글자 색상: 검정/기본을 1번에 배치 (Notion 스타일). 분홍은 "더보기"에서만 노출. */
export const TEXT_COLOR_SWATCHES: ColorSwatch[] = [
  { label: "검정", value: "#111827" },
  { label: "회색", value: "#6b7280" },
  { label: "빨강", value: "#ef4444" },
  { label: "주황", value: "#f97316" },
  { label: "노랑", value: "#eab308" },
  { label: "초록", value: "#22c55e" },
  { label: "파랑", value: "#3b82f6" },
  { label: "보라", value: "#8b5cf6" },
  { label: "분홍", value: "#ec4899" },
];
/* 버블 툴바에 바로 노출되는 빠른 선택 목록 (8개) */
export const TEXT_COLOR_QUICK: ColorSwatch[] = TEXT_COLOR_SWATCHES.slice(0, 8);

/* 형광펜 빠른 선택 — 노랑이 기본 추천으로 1번 */
export const HIGHLIGHT_SWATCHES: ColorSwatch[] = [
  { label: "노랑", value: "#fef08a" },
  { label: "초록", value: "#bbf7d0" },
  { label: "파랑", value: "#bfdbfe" },
  { label: "분홍", value: "#fbcfe8" },
  { label: "보라", value: "#f5d0fe" },
  { label: "회색", value: "#e5e7eb" },
];

const shapeClass = (shape: "circle" | "square") => (shape === "circle" ? "rounded-full" : "rounded-[4px]");

/** 버블 툴바에 바로 노출되는 인라인 스와치 한 줄 (드롭다운 없이 즉시 클릭 적용) */
export function QuickSwatchRow({
  swatches,
  currentValue,
  shape = "circle",
  onSelect,
}: {
  swatches: ColorSwatch[];
  currentValue: string | null;
  shape?: "circle" | "square";
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-[3px]">
      {swatches.map((s) => {
        const active = currentValue === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(s.value)}
            title={s.label}
            aria-label={`${s.label} 적용`}
            className={cx(
              "relative grid h-[15px] w-[15px] shrink-0 place-items-center border transition-transform hover:scale-115",
              shapeClass(shape),
              active ? "border-txt ring-1 ring-offset-1 ring-primary ring-offset-surface" : "border-line/40"
            )}
            style={{ background: s.value }}
          >
            {active && (
              <Check size={9} className="text-white drop-shadow" strokeWidth={3.5} />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface MorePopoverProps {
  title: string;
  currentValue: string | null;
  recentValues: string[];
  resetLabel: string;
  onSelect: (value: string) => void;
  onReset: () => void;
  shape?: "circle" | "square";
}

/** 빠른 스와치에 없는 색상을 고를 때 — 커스텀 색상 + 최근 사용 + 초기화 */
export function MoreColorPopover({
  title,
  currentValue,
  recentValues,
  resetLabel,
  onSelect,
  onReset,
  shape = "circle",
}: MorePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        title={`${title} 더보기`}
        aria-label={`${title} 더보기`}
        className={cx(
          "grid h-[20px] w-[16px] shrink-0 place-items-center rounded transition-colors",
          open ? "bg-primary/15 text-primary" : "text-txt3 hover:bg-surface2/70 hover:text-txt"
        )}
      >
        <MoreHorizontal size={12} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-[180px] overflow-hidden rounded-lg border border-line/60 p-2.5"
          style={{ background: "rgb(var(--surface))", boxShadow: "0 8px 24px -4px rgba(2,6,23,0.45)" }}
        >
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-[11px] font-semibold text-txt2">{title}</span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onReset(); setOpen(false); }}
              title={resetLabel}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-txt3 transition-colors hover:bg-surface2/70 hover:text-txt"
            >
              <RotateCcw size={10} />
            </button>
          </div>

          {/* 커스텀 색상 (네이티브 색상 선택기) */}
          <label className="mb-2 flex items-center gap-2 rounded-md border border-line/40 px-2 py-1.5 text-[11px] text-txt2 transition-colors hover:bg-surface2/50">
            <input
              type="color"
              value={currentValue ?? "#888888"}
              onChange={(e) => onSelect(e.target.value)}
              className={cx("h-4 w-4 shrink-0 cursor-pointer border-0 p-0", shapeClass(shape))}
              title="커스텀 색상"
              aria-label="커스텀 색상 선택"
            />
            커스텀 색상
          </label>

          {recentValues.length > 0 && (
            <div>
              <p className="mb-1 px-0.5 text-[9px] text-txt3">최근 사용</p>
              <div className="flex flex-wrap gap-1.5 px-0.5">
                {recentValues.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onSelect(v); setOpen(false); }}
                    className={cx("h-4 w-4 shrink-0 border border-line/40 transition-transform hover:scale-110", shapeClass(shape))}
                    style={{ background: v }}
                    title={v}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
