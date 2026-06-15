"use client";

import React, { useState, useRef, MouseEvent } from "react";
import { Columns2, Rows2, X, ChevronDown } from "lucide-react";
import { cx } from "@/lib/utils";
import { PaneLeaf, MockNote } from "./types";
import { DropZone } from "./paneUtils";

interface Props {
  node: PaneLeaf;
  note: MockNote;
  isActive: boolean;
  totalLeaves: number;
  allNotes: MockNote[];
  dragNoteId: string | null;
  onActivate: () => void;
  onSplitRight: () => void;
  onSplitDown: () => void;
  onClose: () => void;
  onChangeNote: (noteId: string) => void;
  onDrop: (zone: DropZone, noteId: string) => void;
}

const ZONE_META: Record<DropZone, { label: string; arrow: string }> = {
  left:   { label: "왼쪽 분할",  arrow: "←" },
  right:  { label: "오른쪽 분할", arrow: "→" },
  top:    { label: "위 분할",    arrow: "↑" },
  bottom: { label: "아래 분할",  arrow: "↓" },
  center: { label: "노트 교체",  arrow: "⇄" },
};

/* ── 마크다운 렌더러 (BrainX 타이포그래피) ──────────── */
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  const codeBuffer: string[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-3 overflow-x-auto rounded-lg border border-line/50 bg-surface2/60 p-3 font-mono text-[12px] leading-[1.55] text-txt2"
          >
            {codeBuffer.join("\n")}
          </pre>
        );
        codeBuffer.length = 0;
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) { codeBuffer.push(line); return; }

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mb-3 mt-4 text-[18px] font-bold leading-tight tracking-tight text-txt first:mt-0">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mb-2 mt-5 border-b border-line/50 pb-1.5 text-[14px] font-semibold leading-snug text-txt">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mb-1.5 mt-4 text-[13px] font-semibold text-txt3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="mb-0.5 flex gap-2 pl-1">
          <span className="mt-px shrink-0 text-[13px] text-accent/70">•</span>
          <span className="text-[14px] leading-[1.75] text-txt2">{line.slice(2)}</span>
        </div>
      );
    } else if (/^\d+\./.test(line)) {
      elements.push(
        <div key={i} className="mb-0.5 pl-1 text-[14px] leading-[1.75] text-txt2">
          {line}
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="mb-0.5 text-[14px] leading-[1.85] text-txt2">
          {line}
        </p>
      );
    }
  });

  return <div>{elements}</div>;
}

/* ── 메인 컴포넌트 ───────────────────────────────────── */
export default function PaneLeafView({
  node,
  note,
  isActive,
  totalLeaves,
  allNotes,
  dragNoteId,
  onActivate,
  onSplitRight,
  onSplitDown,
  onClose,
  onChangeNote,
  onDrop,
}: Props) {
  const [hoverZone, setHoverZone] = useState<DropZone | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn(); };

  function getZone(e: React.DragEvent<HTMLDivElement>): DropZone {
    const el = overlayRef.current;
    if (!el) return "center";
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (x < 0.25) return "left";
    if (x > 0.75) return "right";
    if (y < 0.25) return "top";
    if (y > 0.75) return "bottom";
    return "center";
  }

  return (
    <div
      onClick={onActivate}
      className={cx(
        "relative flex h-full flex-col overflow-hidden transition-[border-color] duration-150",
        isActive ? "border-t-2 border-primary" : "border-t-2 border-transparent"
      )}
    >
      {/* ── 탭 헤더 ──────────────────────────────────── */}
      <div
        className={cx(
          "flex h-10 shrink-0 items-center gap-2 border-b border-line/50 px-3",
          isActive ? "bg-primary/[0.04]" : "bg-bg2/30"
        )}
      >
        {/* 활성 표시 점 */}
        {isActive && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        )}

        {/* 노트 선택 드롭다운 */}
        <div className="relative flex min-w-0 flex-1 items-center">
          <select
            value={node.noteId}
            onChange={(e) => onChangeNote(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={cx(
              "flex-1 cursor-pointer appearance-none bg-transparent pr-4 text-[12px] outline-none",
              isActive ? "font-medium text-txt" : "text-txt2"
            )}
            style={{ WebkitAppearance: "none" }}
          >
            {allNotes.map((n) => (
              <option
                key={n.id}
                value={n.id}
                className="bg-surface2 text-txt"
              >
                {n.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="pointer-events-none absolute right-1 text-txt3/60"
          />
        </div>

        {/* 태그 */}
        {note.tags[0] && (
          <span className="shrink-0 rounded border border-line/40 px-1.5 py-px text-[9px] text-txt3">
            {note.tags[0]}
          </span>
        )}

        {/* 액션 버튼 */}
        <div className="flex shrink-0 items-center gap-0.5">
          <PanelBtn onClick={stop(onSplitRight)} title="오른쪽 분할">
            <Columns2 size={11} />
          </PanelBtn>
          <PanelBtn onClick={stop(onSplitDown)} title="아래 분할">
            <Rows2 size={11} />
          </PanelBtn>
          {totalLeaves > 1 && (
            <PanelBtn onClick={stop(onClose)} title="패널 닫기" isClose>
              <X size={11} />
            </PanelBtn>
          )}
        </div>
      </div>

      {/* ── 콘텐츠: White Canvas ─────────────────────── */}
      <div
        className="scroll flex-1 overflow-y-auto"
        style={{ background: "rgb(var(--surface))" }}
      >
        <div className="px-8 py-7">
          {/* 노트 제목 */}
          <h1 className="mb-2 text-[22px] font-bold leading-tight tracking-tight text-txt">
            {note.title}
          </h1>

          {/* 태그 목록 */}
          {note.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-1.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line/50 bg-surface2/50 px-2.5 py-0.5 text-[11px] text-txt3"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 마크다운 콘텐츠 */}
          <SimpleMarkdown content={note.content} />
        </div>
      </div>

      {/* ── DnD 오버레이 ─────────────────────────────── */}
      {dragNoteId !== null && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10"
          style={{ background: "rgb(var(--primary) / 0.03)" }}
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
          <DropZoneArea
            zone="top"
            active={hoverZone === "top"}
            style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: "28%" }}
          />
          <DropZoneArea
            zone="bottom"
            active={hoverZone === "bottom"}
            style={{ position: "absolute", bottom: 0, left: "20%", right: "20%", height: "28%" }}
          />
          <DropZoneArea
            zone="left"
            active={hoverZone === "left"}
            style={{ position: "absolute", top: "20%", bottom: "20%", left: 0, width: "28%" }}
          />
          <DropZoneArea
            zone="right"
            active={hoverZone === "right"}
            style={{ position: "absolute", top: "20%", bottom: "20%", right: 0, width: "28%" }}
          />
          <DropZoneArea
            zone="center"
            active={hoverZone === "center"}
            style={{ position: "absolute", top: "28%", bottom: "28%", left: "28%", right: "28%" }}
          />
        </div>
      )}
    </div>
  );
}

/* ── 패널 헤더 버튼 ─────────────────────────────────── */
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

/* ── DnD 드롭 구역 ──────────────────────────────────── */
function DropZoneArea({
  zone,
  active,
  style,
}: {
  zone: DropZone;
  active: boolean;
  style: React.CSSProperties;
}) {
  const meta = ZONE_META[zone];
  return (
    <div
      style={{
        ...style,
        background: active ? "rgb(var(--primary) / 0.10)" : "transparent",
        border: active ? "2px dashed rgb(var(--primary) / 0.45)" : "2px dashed transparent",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 6,
        transition: "background 0.1s, border-color 0.1s",
        pointerEvents: "none",
      }}
    >
      {active && (
        <>
          <span style={{ fontSize: 22, lineHeight: 1, color: "rgb(var(--primary))" }}>
            {meta.arrow}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgb(var(--primary))",
              background: "rgb(var(--surface))",
              padding: "3px 12px",
              borderRadius: 20,
              border: "1px solid rgb(var(--primary) / 0.3)",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-sans)",
            }}
          >
            {meta.label}
          </span>
        </>
      )}
    </div>
  );
}
