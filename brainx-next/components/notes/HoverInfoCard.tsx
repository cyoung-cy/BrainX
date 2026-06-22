"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** 노트 탐색기의 폴더/노트 행에 마우스를 올리면 뜨는 Obsidian 스타일 정보 카드.
    빠르게 여러 행을 훑고 지나갈 때 카드가 깜빡이며 계속 따라다니지 않도록, 같은 행에
    450ms 이상 머물러야 뜨고 벗어나면 바로 사라진다(요구사항: 깜빡임 방지). 트리 영역이
    `overflow-y-auto`라 잘릴 수 있어 document.body에 portal로 띄운다. */
export function HoverInfoCard({
  anchorRef,
  hovered,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  hovered: boolean;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hovered) {
      timerRef.current = window.setTimeout(() => {
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPos({ left: rect.right + 8, top: rect.top });
        setVisible(true);
      }, 450);
    } else {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      setVisible(false);
    }
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [hovered, anchorRef]);

  if (!visible || !pos) return null;

  const width = 220;
  // 화면 밖으로 나가면(우측 컨텍스트 패널/뷰포트 경계) 행의 왼쪽에 띄운다.
  const left = pos.left + width > window.innerWidth - 4 ? Math.max(4, pos.left - width - 16) : pos.left;
  const top = Math.max(4, Math.min(pos.top, window.innerHeight - 90));

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none rounded-lg border border-line/60 px-3 py-2 text-[11px] leading-relaxed text-txt2"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 2200,
        width,
        background: "rgb(var(--surface))",
        boxShadow: "0 8px 20px -4px rgba(2,6,23,0.4)",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
