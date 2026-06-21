"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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

/** 비율 프리셋·사용자 지정 비율을 "원본(자연) 픽셀 크기" 기준으로 환산한 목표 너비(px).
    "맞춤"은 컨테이너에 맞추는 모드라 고정 px가 없으므로 null. naturalWidthPx를 아직 모르면
    (이미지 로딩 전 등) 계산할 수 없어 역시 null을 반환한다 — 호출 쪽에서는 이 경우 "맞춤"과
    동일하게 폴백 처리하면 되고, 측정이 끝나는 즉시 정확한 값으로 다시 그려진다. */
export function blockTargetPx(
  widthMode: BlockWidthMode,
  widthPercent: number | null,
  naturalWidthPx: number | null
): number | null {
  if (widthMode === "fit") return null;
  if (naturalWidthPx == null) return null;
  if (widthMode === "original") return naturalWidthPx;
  return naturalWidthPx * (blockWidthPercent(widthMode, widthPercent) / 100);
}

/** 블록 바깥 프레임. 목표 px를 모르면(맞춤 포함) 컨테이너 폭에 맞추고, 알면 그 px로 고정해
    정렬(블록 justify)이 실제 콘텐츠 크기를 기준으로 동작하게 한다. 목표 px가 컨테이너보다
    크면 maxWidth가 프레임을 컨테이너 폭으로 캡핑하고, 안쪽 콘텐츠(blockContentStyle)가 그
    안에서 가로 스크롤된다. */
export function blockFrameStyle(
  widthMode: BlockWidthMode,
  widthPercent: number | null,
  naturalWidthPx: number | null
): React.CSSProperties {
  const px = blockTargetPx(widthMode, widthPercent, naturalWidthPx);
  if (px == null) return { width: "100%", maxWidth: "100%" };
  return { width: `${px}px`, maxWidth: "100%" };
}

/** 프레임 안쪽 실제 콘텐츠 폭 — 항상 프레임과 같은 px여야 프레임이 컨테이너 폭으로
    캡핑된 뒤에도 콘텐츠가 목표 크기를 유지한 채 프레임 안에서만 스크롤된다. */
export function blockContentStyle(
  widthMode: BlockWidthMode,
  widthPercent: number | null,
  naturalWidthPx: number | null
): React.CSSProperties {
  const px = blockTargetPx(widthMode, widthPercent, naturalWidthPx);
  if (px == null) return { width: "100%", maxWidth: "100%" };
  return { width: `${px}px`, maxWidth: "none", flexShrink: 0 };
}

export function blockJustify(align: BlockAlign): React.CSSProperties["justifyContent"] {
  if (align === "left") return "flex-start";
  if (align === "right") return "flex-end";
  return "center";
}

// 100%는 "원본"과 결과가 항상 같아(둘 다 자연 크기) 중복이라 프리셋에서 제외했다 — 50/150을
// 기준으로 양쪽에 75/125를 더해 4단계로 단순화.
const WIDTH_PRESETS: { mode: BlockWidthMode; label: string }[] = [
  { mode: "fit", label: "맞춤" },
  { mode: "original", label: "원본" },
  { mode: "50", label: "50%" },
  { mode: "75", label: "75%" },
  { mode: "125", label: "125%" },
  { mode: "150", label: "150%" },
];

/** Mermaid/이미지/표 블록에서 쓰는 정렬·크기 조절 미니 툴바. contentEditable=false 영역.
    Split View처럼 좁은 패널 안에서는 이 툴바가 패널 폭에 맞춰 줄바꿈되면서 "맞춤"/"원본" 같은
    한글 라벨이 글자 단위로 세로로 깨지는 문제가 있었다(좁은 컨테이너 안에서 flex item이
    줄바꿈 가능한 채로 눌렸기 때문) — 텍스트 선택 시 뜨는 Bubble Toolbar와 동일하게 이 툴바도
    document.body에 portal로 띄워 패널 폭과 무관하게 항상 전체가 한 줄로, 잘리지 않게 보이도록
    바꿨다. 위치는 anchorRef(블록 hover 영역)의 화면 좌표를 기준으로 계산하고 뷰포트 밖으로
    나가면 좌우를 보정한다. */
export function BlockSizeToolbar({
  value,
  onChange,
  extra,
  anchorRef,
  visible,
}: {
  value: BlockSizeValue;
  onChange: (next: Partial<BlockSizeValue>) => void;
  /** 미리보기/편집 토글 등 블록별 추가 버튼 */
  extra?: React.ReactNode;
  /** 이 영역에 마우스가 있는 동안(또는 selected 등 호출 쪽 조건) 툴바를 띄운다 — 보통 블록의
      hover 감지용 wrapper. */
  anchorRef: RefObject<HTMLElement | null>;
  /** 호출 쪽이 판단한 "보여야 하는가"(hover 중이거나 선택됨 등). 툴바 자신에게 마우스가 올라간
      동안은 이 값이 false라도 내부적으로 계속 보여준다(버튼으로 마우스를 옮기는 순간 사라지는
      문제 방지) — 그 경계를 매끄럽게 잇기 위한 디바운스도 내부에서 처리한다. */
  visible: boolean;
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [selfHovered, setSelfHovered] = useState(false);
  const [shouldRender, setShouldRender] = useState(visible);
  const hideTimerRef = useRef<number | null>(null);

  // anchor(블록) hover든, 툴바 자신에 대한 hover든 둘 중 하나만 true여도 보여준다. 둘 다
  // false가 되는 순간 바로 숨기지 않고 200ms 유예를 둬서(요구사항: 100~300ms hover buffer)
  // 블록에서 툴바로 마우스가 이동하는 짧은 공백 동안 깜빡이며 사라지지 않게 한다.
  useEffect(() => {
    const shouldShow = visible || selfHovered;
    if (shouldShow) {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setShouldRender(true);
    } else {
      hideTimerRef.current = window.setTimeout(() => setShouldRender(false), 200);
    }
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, [visible, selfHovered]);

  const updatePos = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? 0;
    const margin = 4;
    // 우측 컨텍스트 패널(RightSidebar) 영역까지 넘어가 가려지는 문제를 막기 위해, window
    // 전체 폭이 아니라 이 블록이 실제로 속한 .ProseMirror(노트 작성 영역)의 폭으로 클램프한다
    // — 컨텍스트 패널은 그 DOM 바깥에 있으므로 자동으로 제외된다.
    const editorEl = anchor.closest(".ProseMirror") as HTMLElement | null;
    const safeRect = editorEl?.getBoundingClientRect();
    const minLeft = (safeRect?.left ?? 0) + margin;
    const maxLeft = (safeRect?.right ?? window.innerWidth) - toolbarWidth - margin;
    let left = anchorRect.right - toolbarWidth;
    left = Math.max(minLeft, Math.min(left, Math.max(minLeft, maxLeft)));
    const top = Math.max(margin, anchorRect.top + margin);
    setPos({ left, top });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (shouldRender) updatePos();
  }, [shouldRender, updatePos, value.widthMode, value.widthPercent, value.align]);

  useEffect(() => {
    if (!shouldRender) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [shouldRender, updatePos]);

  if (!shouldRender) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      contentEditable={false}
      onMouseEnter={() => setSelfHovered(true)}
      onMouseLeave={() => setSelfHovered(false)}
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-0.5 whitespace-nowrap rounded-lg border border-line/60 px-1 py-0.5 text-txt2 shadow-soft"
      style={{
        position: "fixed",
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
        zIndex: 2000,
        background: "rgb(var(--surface))",
      }}
    >
      {(["left", "center", "right"] as BlockAlign[]).map((a) => (
        <button
          key={a}
          type="button"
          title={a === "left" ? "왼쪽 정렬" : a === "center" ? "가운데 정렬" : "오른쪽 정렬"}
          aria-label={a === "left" ? "왼쪽 정렬" : a === "center" ? "가운데 정렬" : "오른쪽 정렬"}
          onClick={() => onChange({ align: a })}
          className={cx(
            "grid h-6 w-6 shrink-0 place-items-center rounded transition-colors",
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
            "shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10.5px] font-medium transition-colors",
            value.widthMode === p.mode ? "bg-primary/15 text-primary" : "hover:bg-surface2/70 hover:text-txt"
          )}
        >
          {p.label}
        </button>
      ))}

      <CustomPercentInput value={value} onChange={onChange} />

      {extra}
    </div>,
    document.body
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
      // 부모 BlockSizeToolbar의 onMouseDown={e=>e.preventDefault()}가 버블링되어 이 input의
      // 기본 포커스 동작까지 막아버려서(버튼은 onClick만 있으면 되니 문제 없었지만, 타이핑이
      // 필요한 input은 실제로 클릭해도 포커스가 전혀 잡히지 않았다) 사용자 지정 비율을 입력할
      // 수 없는 버그가 있었다 — stopPropagation으로 그 mousedown이 부모까지 가지 않게 한다.
      onMouseDown={(e) => e.stopPropagation()}
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
