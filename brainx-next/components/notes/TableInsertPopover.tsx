"use client";

import { useEffect, useRef, useState } from "react";
import { Table2 } from "lucide-react";
import { cx } from "@/lib/utils";

const MIN = 1;
const MAX = 20;
const PRESETS = [2, 3, 4];

function clamp(n: number) {
  return Math.min(Math.max(n, MIN), MAX);
}

/** "행"/"열" 숫자 입력 1개 — blur/Enter 시점에만 커밋하고, 잘못된 값(빈 값/NaN)이면 직전
    값으로 되돌린다(`BlockControls.tsx`의 `CustomPercentInput`과 동일한 커밋 패턴 — 매 keystroke마다
    부모 state를 바꾸면 입력 중 포커스가 불안정해질 수 있어서 로컬 draft로 분리). */
function CountInput({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && draft.trim() !== "") {
      onCommit(clamp(Math.round(n)));
    } else {
      setDraft(String(value));
    }
  };

  return (
    <label className="flex items-center gap-1.5 text-[11px] text-txt2">
      <span className="w-5 shrink-0 text-txt3">{label}</span>
      <input
        type="number"
        min={MIN}
        max={MAX}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
        }}
        className="h-6 w-12 rounded border border-line/50 bg-transparent px-1.5 text-[11px] text-txt outline-none"
      />
    </label>
  );
}

/** "표 삽입" 버튼 — 토글하면 행/열 개수를 직접 지정하는 작은 팝오버가 열린다. 기존
    `ColorPalette.tsx`의 `MoreColorPopover`와 동일한 토글+outside-click-to-close 패턴. */
export function TableInsertPopover({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const insert = () => {
    onInsert(rows, cols);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="표 삽입"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "grid h-6 w-6 place-items-center rounded transition-colors",
          open ? "bg-primary/15 text-primary" : "text-txt3 hover:bg-surface2/70 hover:text-txt"
        )}
      >
        <Table2 size={13} />
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-1.5 w-[200px] overflow-hidden rounded-lg border border-line/60 p-2.5"
          style={{ background: "rgb(var(--surface))", boxShadow: "0 8px 24px -4px rgba(2,6,23,0.45)" }}
        >
          <p className="mb-2 px-0.5 text-[11px] font-semibold text-txt2">표 삽입</p>
          <div className="mb-2 flex items-center gap-3 px-0.5">
            <CountInput label="행" value={rows} onCommit={setRows} />
            <CountInput label="열" value={cols} onCommit={setCols} />
          </div>
          <div className="mb-2 flex items-center gap-1 px-0.5">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setRows(n); setCols(n); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-txt3 transition-colors hover:bg-surface2/70 hover:text-txt"
              >
                {n}×{n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={insert}
            className="w-full rounded-md py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "rgb(var(--primary))" }}
          >
            삽입
          </button>
        </div>
      )}
    </div>
  );
}
