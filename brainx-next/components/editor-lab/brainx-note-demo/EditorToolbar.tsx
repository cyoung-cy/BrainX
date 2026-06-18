"use client";

import type { Editor } from "@tiptap/react";
import { cx } from "@/lib/utils";

interface Props {
  editor: Editor | null;
  isLight: boolean;
}

export default function EditorToolbar({ editor, isLight }: Props) {
  if (!editor) return null;

  const btn = (
    active: boolean,
    onClick: () => void,
    label: string,
    children: React.ReactNode
  ) => (
    <button
      key={label}
      onClick={onClick}
      title={label}
      className={cx(
        "min-w-[26px] h-7 px-1.5 rounded text-[12px] transition-all leading-none",
        active
          ? "bg-primary/20 text-primary"
          : isLight
          ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          : "text-txt2 hover:text-txt hover:bg-surface2"
      )}
    >
      {children}
    </button>
  );

  const mockBtn = (label: string, content: React.ReactNode) => (
    <button
      key={label}
      title={`${label} (구현 예정)`}
      className={cx(
        "min-w-[26px] h-7 px-1.5 rounded text-[12px] transition-all leading-none opacity-40 cursor-not-allowed",
        isLight ? "text-slate-400" : "text-txt3"
      )}
    >
      {content}
    </button>
  );

  const sep = (key: string) => (
    <div
      key={key}
      className={cx("w-px h-4 mx-0.5 shrink-0", isLight ? "bg-slate-200" : "bg-line/50")}
    />
  );

  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b",
        isLight ? "border-slate-200 bg-slate-50" : "border-line/40 bg-surface2/30"
      )}
    >
      {/* Text formatting */}
      {btn(
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        "굵게 (Ctrl+B)",
        <b>B</b>
      )}
      {btn(
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "기울임 (Ctrl+I)",
        <i>I</i>
      )}
      {btn(
        editor.isActive("strike"),
        () => editor.chain().focus().toggleStrike().run(),
        "취소선",
        <s>S</s>
      )}
      {btn(
        editor.isActive("code"),
        () => editor.chain().focus().toggleCode().run(),
        "인라인 코드",
        <span className="font-mono text-[11px]">{"`"}</span>
      )}
      {mockBtn("밑줄", <span className="underline">U</span>)}
      {mockBtn("위첨자", <span className="text-[10px]">X²</span>)}
      {mockBtn("아래첨자", <span className="text-[10px]">X₂</span>)}
      {mockBtn("하이라이트", <span className="bg-yellow-300/50 px-0.5">H</span>)}

      {sep("s1")}

      {/* Headings */}
      {([1, 2, 3, 4, 5, 6] as const).slice(0, 3).map((level) =>
        btn(
          editor.isActive("heading", { level }),
          () => editor.chain().focus().toggleHeading({ level }).run(),
          `제목 ${level}`,
          <span className="font-bold text-[10px]">H{level}</span>
        )
      )}
      {mockBtn("H4", <span className="font-bold text-[10px]">H4</span>)}
      {mockBtn("H5", <span className="font-bold text-[10px]">H5</span>)}
      {mockBtn("H6", <span className="font-bold text-[10px]">H6</span>)}

      {sep("s2")}

      {/* Lists */}
      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "불릿 목록",
        <span className="text-[13px]">≡</span>
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "순서 목록",
        <span className="text-[11px] font-mono">1.</span>
      )}
      {mockBtn("체크박스", <span className="text-[11px]">☑</span>)}

      {sep("s3")}

      {/* Block types */}
      {btn(
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
        "인용구",
        <span className="text-[14px]">❝</span>
      )}
      {btn(
        editor.isActive("codeBlock"),
        () => editor.chain().focus().toggleCodeBlock().run(),
        "코드 블록",
        <span className="font-mono text-[11px]">{"</>"}</span>
      )}
      {mockBtn("콜아웃", <span className="text-[11px]">💡</span>)}
      {btn(
        false,
        () => editor.chain().focus().setHorizontalRule().run(),
        "구분선",
        <span className="text-[14px]">—</span>
      )}

      {sep("s4")}

      {/* Mock: table, image, embed */}
      {mockBtn("테이블", <span className="text-[11px]">⊞</span>)}
      {mockBtn("이미지", <span className="text-[11px]">🖼</span>)}
      {mockBtn("수식 (LaTeX)", <span className="font-mono text-[10px]">∑</span>)}
      {mockBtn("Mermaid", <span className="text-[10px]">◈</span>)}

      {sep("s5")}

      {/* Font size (mock) */}
      <div
        className={cx(
          "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] cursor-not-allowed opacity-40",
          isLight ? "bg-white border border-slate-200 text-slate-500" : "bg-surface/60 border border-line/40 text-txt3"
        )}
        title="폰트 크기 (구현 예정)"
      >
        <span>16px</span>
        <span className="text-[9px]">▾</span>
      </div>

      {/* Font family (mock) */}
      <div
        className={cx(
          "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] cursor-not-allowed opacity-40",
          isLight ? "bg-white border border-slate-200 text-slate-500" : "bg-surface/60 border border-line/40 text-txt3"
        )}
        title="폰트 패밀리 (구현 예정)"
      >
        <span>Pretendard</span>
        <span className="text-[9px]">▾</span>
      </div>

      {sep("s6")}

      {/* Indent */}
      {btn(
        false,
        () => editor.chain().focus().sinkListItem("listItem").run(),
        "들여쓰기",
        <span className="text-[12px]">→</span>
      )}
      {btn(
        false,
        () => editor.chain().focus().liftListItem("listItem").run(),
        "내어쓰기",
        <span className="text-[12px]">←</span>
      )}

      <div className="flex-1" />

      {/* Undo/Redo */}
      {btn(
        false,
        () => editor.chain().focus().undo().run(),
        "실행 취소 (Ctrl+Z)",
        <span className="text-[12px]">↩</span>
      )}
      {btn(
        false,
        () => editor.chain().focus().redo().run(),
        "다시 실행 (Ctrl+Y)",
        <span className="text-[12px]">↪</span>
      )}
    </div>
  );
}
