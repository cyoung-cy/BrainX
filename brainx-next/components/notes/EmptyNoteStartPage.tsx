"use client";

import type { ReactNode } from "react";
import { FilePlus, FolderOpen, X } from "lucide-react";
import { cx } from "@/lib/utils";

interface StartRowProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function StartRow({ icon, label, shortcut, onClick }: StartRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-lg border border-line/50 px-4 py-3 text-left transition-colors",
        "hover:border-line/80 hover:bg-surface2/50"
      )}
    >
      <span className="shrink-0 text-txt3">{icon}</span>
      <span className="flex-1 text-[13px] font-medium text-txt2">{label}</span>
      {shortcut && (
        <kbd
          className="shrink-0 rounded border border-line/50 px-1.5 py-0.5 text-[10px] font-medium text-txt3"
          style={{ background: "rgb(var(--surface2) / 0.6)" }}
        >
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

interface Props {
  onCreateNote: () => void;
  onGoToFile: () => void;
  onCloseTab: () => void;
}

/** Obsidian의 "새 탭" 시작 화면 — 새 파일 생성하기/파일로 이동하기/닫기 */
export default function EmptyNoteStartPage({ onCreateNote, onGoToFile, onCloseTab }: Props) {
  return (
    <div className="flex h-full flex-1 items-center justify-center" style={{ background: "rgb(var(--surface))" }}>
      <div className="w-full max-w-[360px] space-y-2 px-6">
        <StartRow icon={<FilePlus size={15} />} label="새 파일 생성하기" shortcut="Ctrl+N" onClick={onCreateNote} />
        <StartRow icon={<FolderOpen size={15} />} label="파일로 이동하기" shortcut="Ctrl+O" onClick={onGoToFile} />
        <StartRow icon={<X size={15} />} label="닫기" onClick={onCloseTab} />
      </div>
    </div>
  );
}
