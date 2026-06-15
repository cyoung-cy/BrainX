"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cx } from "@/lib/utils";
import { Icon } from "@/components/brainx-ui";
import { MockNote } from "./types";
import { MOCK_CONTEXT_DATA } from "./mockData";

/* ── 헤딩 파싱 (note-editor-screen.tsx parseHeadings와 동일) ── */
function parseHeadings(content: string) {
  return content
    .split("\n")
    .map((line, index) => {
      const m = /^(#{1,3})\s+(.+)/.exec(line.trim());
      if (!m) return null;
      return { id: `${index}-${m[2]}`, level: m[1].length, text: m[2].trim() };
    })
    .filter((item): item is { id: string; level: number; text: string } => Boolean(item));
}

/* ── 섹션 접기/펼치기 헤더 ────────────────────────────────── */
function SectionToggle({
  label,
  icon,
  open,
  onToggle,
  accent = false,
  className = "",
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  open: boolean;
  onToggle: () => void;
  accent?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx(
        "flex w-full items-center gap-1.5 text-[11px] font-semibold transition-colors",
        accent ? "text-accent hover:text-accent/80" : "text-txt3 hover:text-txt",
        className
      )}
    >
      <Icon name={icon} size={13} />
      <span className="flex-1 text-left">{label}</span>
      {open
        ? <ChevronDown size={12} className="shrink-0 opacity-60" />
        : <ChevronRight size={12} className="shrink-0 opacity-60" />
      }
    </button>
  );
}

interface Props {
  activeNote: MockNote;
  allNotes: MockNote[];
  onCollapse: () => void;
}

/* ── 메인 컴포넌트 ───────────────────────────────────────── */
export default function ContextPanel({ activeNote, allNotes, onCollapse }: Props) {
  /* 섹션별 접기 상태 */
  const [sec, setSec] = useState({ toc: true, links: true, ai: true, chat: true });
  const toggle = (k: keyof typeof sec) => setSec((p) => ({ ...p, [k]: !p[k] }));

  /* AI 채팅 상태 */
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: "ai" | "user"; text: string; streaming?: boolean }>
  >([
    { role: "ai", text: "이 노트에 대해 무엇이든 물어보세요. 관련 노트도 함께 찾아드려요." },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* 현재 활성 노트의 TOC + 컨텍스트 데이터 */
  const toc = useMemo(() => parseHeadings(activeNote.content), [activeNote.content]);
  const ctx = MOCK_CONTEXT_DATA[activeNote.id] ?? { backlinks: [], connections: [], aiSuggestions: [] };

  const sendAi = () => {
    if (!aiInput.trim()) return;
    const prompt = aiInput.trim();
    setAiMessages((m) => [...m, { role: "user", text: prompt }]);
    setAiInput("");

    const answer =
      ctx.aiSuggestions.length > 0
        ? `「${activeNote.title}」 노트를 분석했습니다.\n\n${ctx.aiSuggestions.slice(0, 2).join(", ")} 등의 개념과 연결하면 더 풍부한 지식 체계가 만들어져요.`
        : `「${activeNote.title}」 노트를 분석했습니다. 내용을 더 추가하면 연관 노트를 찾아드릴 수 있어요.`;

    setAiMessages((m) => [...m, { role: "ai", text: "", streaming: true }]);
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 3;
      setAiMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "ai", text: answer.slice(0, idx), streaming: idx < answer.length };
        return next;
      });
      if (idx >= answer.length) {
        window.clearInterval(timer);
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 16);
  };

  return (
    /* NoteEditorScreen 우측 패널과 동일 구조 */
    <div className="flex w-72 shrink-0 flex-col border-l border-line/50 bg-bg2/30">

      {/* ── 패널 헤더: 활성 노트 이름 + 접기 버튼 ── */}
      <div className="flex items-center gap-2 border-b border-line/50 px-3 py-2.5">
        <Icon name="sparkle" size={13} className="shrink-0 text-accent" />
        <span className="flex-1 truncate text-[11px] font-semibold text-txt3">
          {activeNote.title}
        </span>
        <button
          type="button"
          onClick={onCollapse}
          title="컨텍스트 패널 닫기"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-txt3 transition-colors hover:bg-surface2/60 hover:text-txt"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── 상단 스크롤 영역 (목차 / 연결 / AI 제안) ── */}
      <div className="scroll flex-1 space-y-5 overflow-y-auto p-4">

        {/* 1. 목차 */}
        <div>
          <SectionToggle
            label="목차"
            icon="summarize"
            open={sec.toc}
            onToggle={() => toggle("toc")}
            className="mb-2"
          />
          {sec.toc && (
            <div className="space-y-0.5">
              {toc.length ? (
                toc.map((h) => (
                  <div
                    key={h.id}
                    style={{ paddingLeft: (h.level - 1) * 12 + 8 }}
                    className="flex h-7 cursor-pointer items-center truncate rounded-lg pr-2 text-[12.5px] text-txt2 transition-colors hover:bg-surface2/50 hover:text-primary"
                  >
                    {h.text}
                  </div>
                ))
              ) : (
                <p className="px-2 text-[12px] text-txt3">
                  # 으로 제목을 추가하면 목차가 생겨요
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. 연결 · 백링크 */}
        <div>
          <SectionToggle
            label="연결 · 백링크"
            icon="link"
            open={sec.links}
            onToggle={() => toggle("links")}
            className="mb-2"
          />
          {sec.links && (
            <div className="space-y-1.5">
              {/* 아웃바운드 연결 */}
              {ctx.connections.map((title) => {
                const linked = allNotes.find((n) => n.title === title);
                return (
                  <div
                    key={title}
                    className="flex w-full items-center gap-2 rounded-lg bg-surface2/40 p-2.5 transition-colors hover:bg-surface2/70"
                  >
                    <Icon name="link" size={13} className="shrink-0 text-cyan" />
                    <span className="flex-1 truncate text-[12.5px] font-medium text-txt">
                      {title}
                    </span>
                    {!linked && <span className="text-[10px] text-txt3">새로 만들기</span>}
                  </div>
                );
              })}
              {/* 백링크 (이 노트를 참조하는 노트) */}
              {ctx.backlinks.map((title) => (
                <div
                  key={title}
                  className="w-full rounded-lg bg-surface2/40 p-2.5 transition-colors hover:bg-surface2/70"
                >
                  <div className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-txt">
                    <Icon name="arrowL" size={12} className="shrink-0 text-txt3" />
                    {title}
                  </div>
                </div>
              ))}
              {!ctx.connections.length && !ctx.backlinks.length && (
                <p className="px-2 text-[12px] text-txt3">
                  [[노트명]] 으로 다른 노트를 연결해보세요
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3. AI 연결 제안 */}
        <div>
          <SectionToggle
            label="AI 연결 제안"
            icon="sparkle"
            open={sec.ai}
            onToggle={() => toggle("ai")}
            accent
            className="mb-2"
          />
          {sec.ai && (
            <div className="rounded-xl border border-accent/20 bg-accent/[0.07] p-3">
              {ctx.aiSuggestions.length > 0 ? (
                <>
                  <p className="mb-2.5 text-[12.5px] leading-relaxed text-txt2">
                    이 노트는{" "}
                    <b className="text-txt">「{ctx.aiSuggestions[0]}」</b>
                    {ctx.aiSuggestions.length > 1
                      ? ` 외 ${ctx.aiSuggestions.length - 1}개 주제`
                      : ""}와 강하게 연관돼요.
                  </p>
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {ctx.aiSuggestions.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[10.5px] text-accent"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/20"
                  >
                    <Icon name="link" size={12} />
                    연결 추가
                  </button>
                </>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-txt2">
                  분석 중입니다. 내용이 더 추가되면 연관 노트를 제안해드려요.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 인라인 AI (하단 고정 영역) ──────────── */}
      <div
        className={cx(
          "flex shrink-0 flex-col border-t border-line/50 transition-all duration-200",
          sec.chat ? "h-[40%]" : "h-auto"
        )}
      >
        {/* 인라인 AI 섹션 헤더 */}
        <SectionToggle
          label="인라인 AI"
          icon="chat"
          open={sec.chat}
          onToggle={() => toggle("chat")}
          className="px-4 py-2.5"
        />

        {/* 채팅 메시지 목록 */}
        {sec.chat && (
          <>
            <div className="scroll flex-1 space-y-2.5 overflow-y-auto px-3">
              {aiMessages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  className={cx(
                    "rounded-xl p-2.5 text-[12.5px] leading-relaxed",
                    msg.role === "user"
                      ? "ml-6 bg-primary/15 text-txt"
                      : "mr-2 bg-surface2/50 text-txt2"
                  )}
                >
                  <span className={msg.streaming ? "stream-caret" : ""}>
                    {msg.text}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* 입력창 */}
            <div className="flex items-center gap-2 p-3">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendAi(); }}
                placeholder={`${activeNote.title}에 질문…`}
                className="h-9 flex-1 rounded-lg border border-line/50 bg-surface2/60 px-3 text-[12.5px] text-txt outline-none placeholder:text-txt3 focus:border-primary/50"
              />
              <button
                type="button"
                onClick={sendAi}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white transition-opacity hover:brightness-110"
              >
                <Icon name="send" size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
