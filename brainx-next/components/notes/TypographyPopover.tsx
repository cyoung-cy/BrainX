"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Type, RotateCcw } from "lucide-react";
import { cx } from "@/lib/utils";
import type { NoteTypography } from "@/lib/notes/noteTypes";
import { FONT_FAMILY_PRESETS } from "./fontExtensions";
import {
  computeTypographyPx,
  TYPOGRAPHY_SCALE_MIN,
  TYPOGRAPHY_SCALE_MAX,
} from "@/lib/notes/typography";

const SCALE_PRESETS = [80, 90, 100, 110, 120, 130, 150];

const LEVEL_LABELS: { key: "body" | "h1" | "h2" | "h3"; label: string }[] = [
  { key: "body", label: "본문" },
  { key: "h1", label: "H1" },
  { key: "h2", label: "H2" },
  { key: "h3", label: "H3" },
];

/** 노트 "전체"에 적용되는 문서 기본 타이포그래피 설정 패널 — 선택한 텍스트에만 적용되는
    BubbleToolbar의 Aa(FontPopover)와 헷갈리지 않도록 트리거 버튼/문구를 분명히 구분한다:
    이 패널은 "문서 기본 서식"(전체 노트), FontPopover는 "선택한 텍스트만". */
export function TypographyPopover({
  typography,
  onChange,
}: {
  typography?: NoteTypography;
  onChange: (next: NoteTypography | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /* 패널이 노트 본문 영역(좁은 Split View 패널 등)의 overflow:hidden 컨테이너 안에 그냥
     absolute로 떠 있으면 패널 폭보다 큰 콘텐츠가 잘린다 — BubbleToolbar/BlockSizeToolbar와
     같은 방식으로 document.body portal + position:fixed + viewport clamp로 바꿔서 패널 크기와
     무관하게 항상 전체가 보이게 한다. */
  const updatePos = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = popoverRef.current;
    if (!trigger) return;
    const triggerRect = trigger.getBoundingClientRect();
    const margin = 8;
    const panelWidth = panel?.offsetWidth ?? 240;
    const panelHeight = panel?.offsetHeight ?? 0;

    let left = triggerRect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

    let top = triggerRect.bottom + 6;
    if (top + panelHeight > window.innerHeight - margin) {
      // 아래쪽 공간이 부족하면 트리거 버튼 위쪽에 띄운다(BubbleToolbar의 위/아래 자동 전환과 동일)
      const above = triggerRect.top - panelHeight - 6;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - panelHeight - margin);
    }
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const scalePercent = typography?.scalePercent ?? 100;
  const computed = computeTypographyPx(typography);
  const hasCustom = !!(typography?.scalePercent || typography?.overrides || typography?.fontFamily);

  const patch = (partial: Partial<NoteTypography>) => {
    onChange({ ...typography, ...partial });
  };

  const setScale = (percent: number) => {
    const clamped = Math.min(TYPOGRAPHY_SCALE_MAX, Math.max(TYPOGRAPHY_SCALE_MIN, percent));
    patch({ scalePercent: clamped });
  };

  const setOverride = (key: "body" | "h1" | "h2" | "h3", value: number | null) => {
    const overrides = { ...typography?.overrides };
    if (value === null) delete overrides[key];
    else overrides[key] = value;
    const hasAny = Object.keys(overrides).length > 0;
    patch({ overrides: hasAny ? overrides : undefined });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="문서 기본 서식 (이 노트 전체에 적용)"
        aria-label="문서 기본 서식 설정"
        className={cx(
          "flex h-[26px] items-center gap-1 rounded px-1.5 text-[11px] font-medium transition-colors",
          open || hasCustom ? "bg-primary/15 text-primary" : "text-txt3 hover:bg-surface2/70 hover:text-txt2"
        )}
      >
        <Type size={13} />
        <span>서식</span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="w-[240px] overflow-hidden rounded-lg border border-line/60 p-3"
          style={{
            position: "fixed",
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            visibility: pos ? "visible" : "hidden",
            zIndex: 2000,
            background: "rgb(var(--surface))",
            boxShadow: "0 8px 24px -4px rgba(2,6,23,0.45)",
          }}
        >
          <div className="mb-3">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-txt">문서 기본 서식</span>
              {hasCustom && (
                <button
                  type="button"
                  onClick={() => onChange(undefined)}
                  title="기본값으로 되돌리기"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-txt3 transition-colors hover:bg-surface2/70 hover:text-txt"
                >
                  <RotateCcw size={10} />
                </button>
              )}
            </div>
            <p className="text-[10.5px] leading-snug text-txt3">
              이 노트 전체에 적용됩니다. 특정 텍스트만 바꾸려면 텍스트를 선택한 뒤 서식 도구의
              &quot;Aa&quot;를 사용하세요.
            </p>
          </div>

          {/* 4-1: 전역 배율 — 본문/H1/H2/H3가 함께 비율로 변경된다 */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="text-[11px] font-semibold text-txt2">기본 글꼴 크기</span>
              <span className="text-[10.5px] text-txt3">{scalePercent}%</span>
            </div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1 px-0.5">
              {SCALE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setScale(p)}
                  className={cx(
                    "rounded px-1.5 py-0.5 text-[10.5px] transition-colors",
                    scalePercent === p ? "bg-primary/15 text-primary" : "text-txt2 hover:bg-surface2/70 hover:text-txt"
                  )}
                >
                  {p === 100 ? "기본" : `${p}%`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={TYPOGRAPHY_SCALE_MIN}
              max={TYPOGRAPHY_SCALE_MAX}
              step={5}
              value={scalePercent}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 4-2: 레벨별 개별 설정 — scalePercent 계산값을 무시하고 직접 px 지정 */}
          <div className="mb-3">
            <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-txt2">개별 크기 설정 (px)</p>
            <div className="flex flex-col gap-1">
              {LEVEL_LABELS.map(({ key, label }) => {
                const overrideVal = typography?.overrides?.[key];
                return (
                  <div key={key} className="flex items-center gap-1.5 px-0.5">
                    <span className="w-6 text-[10.5px] text-txt3">{label}</span>
                    <input
                      type="number"
                      value={overrideVal ?? Math.round(computed[key])}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setOverride(key, Number.isFinite(n) && n > 0 ? n : null);
                      }}
                      className={cx(
                        "h-6 w-14 rounded border px-1.5 text-[11px] outline-none",
                        overrideVal != null
                          ? "border-primary/50 bg-primary/5 text-txt"
                          : "border-line/50 bg-transparent text-txt3"
                      )}
                    />
                    {overrideVal != null && (
                      <button
                        type="button"
                        onClick={() => setOverride(key, null)}
                        title="개별 설정 해제 (전역 배율 값 사용)"
                        className="text-[10px] text-txt3 hover:text-txt2"
                      >
                        해제
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-3: 문서 전체 기본 글꼴 — 선택 텍스트 전용 FontPopover와 별개 */}
          <div>
            <p className="mb-1.5 px-0.5 text-[11px] font-semibold text-txt2">문서 기본 글꼴</p>
            <div className="flex flex-col gap-0.5">
              {FONT_FAMILY_PRESETS.map((f) => {
                const active = f.value === null ? !typography?.fontFamily : typography?.fontFamily === f.value;
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => patch({ fontFamily: f.value })}
                    style={{ fontFamily: f.value ?? undefined }}
                    className={cx(
                      "rounded px-2 py-1 text-left text-[12px] transition-colors",
                      active ? "bg-primary/15 text-primary" : "text-txt2 hover:bg-surface2/70 hover:text-txt"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
