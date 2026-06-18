"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { cx } from "@/lib/utils";

interface SlashCommand {
  id: string;
  label: string;
  icon: string;
  description: string;
  action: (editor: Editor) => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "h1",
    label: "/h1",
    icon: "H₁",
    description: "제목 1",
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "/h2",
    icon: "H₂",
    description: "제목 2",
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "/h3",
    icon: "H₃",
    description: "제목 3",
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet",
    label: "/list",
    icon: "•",
    description: "불릿 목록",
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    label: "/ordered",
    icon: "1.",
    description: "순서 목록",
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "quote",
    label: "/quote",
    icon: "❝",
    description: "인용구",
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "/code",
    icon: "</>",
    description: "코드 블록",
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "/divider",
    icon: "—",
    description: "구분선",
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "table",
    label: "/table",
    icon: "⊞",
    description: "테이블 (구현 예정)",
    action: (_e) => alert("테이블 삽입: 곧 구현 예정입니다."),
  },
  {
    id: "callout",
    label: "/callout",
    icon: "💡",
    description: "콜아웃 박스 (구현 예정)",
    action: (_e) => alert("콜아웃: 곧 구현 예정입니다."),
  },
  {
    id: "image",
    label: "/image",
    icon: "🖼",
    description: "이미지 업로드 (목업)",
    action: (_e) => alert("이미지 업로드: 목업 UI 표시"),
  },
  {
    id: "date",
    label: "/date",
    icon: "📅",
    description: "오늘 날짜 삽입",
    action: (e) => {
      const today = new Date().toLocaleDateString("ko-KR");
      e.chain().focus().insertContent(today).run();
    },
  },
  {
    id: "ai",
    label: "/ai",
    icon: "✦",
    description: "AI 도움 요청",
    action: (_e) => alert("AI 도움: 선택 텍스트를 선택 후 AI 버튼을 클릭하세요."),
  },
];

interface Props {
  editor: Editor | null;
  isLight: boolean;
  query: string;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function SlashCommandMenu({
  editor,
  isLight,
  query,
  onClose,
  position,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const filtered = SLASH_COMMANDS.filter(
    (cmd) =>
      query === "" ||
      cmd.label.includes(query.toLowerCase()) ||
      cmd.description.includes(query)
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!editor || filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1000,
        minWidth: 240,
      }}
      className={cx(
        "rounded-xl border shadow-soft overflow-hidden py-1",
        isLight
          ? "bg-white border-slate-200"
          : "bg-surface2 border-line/60"
      )}
    >
      <div className={cx(
        "px-3 py-1.5 text-[10px] font-semibold",
        isLight ? "text-slate-400" : "text-txt3"
      )}>
        슬래시 커맨드
      </div>
      {filtered.map((cmd) => (
        <button
          key={cmd.id}
          onClick={() => {
            cmd.action(editor);
            onClose();
          }}
          className={cx(
            "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
            isLight
              ? "hover:bg-slate-100 text-slate-700"
              : "hover:bg-surface text-txt2"
          )}
        >
          <span
            className={cx(
              "w-7 h-7 flex items-center justify-center rounded font-mono text-[11px] shrink-0",
              isLight ? "bg-slate-100 text-slate-500" : "bg-surface text-txt3"
            )}
          >
            {cmd.icon}
          </span>
          <div>
            <div className={cx("text-[12px] font-medium", isLight ? "text-slate-700" : "text-txt")}>
              {cmd.description}
            </div>
            <div className={cx("text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>
              {cmd.label}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
