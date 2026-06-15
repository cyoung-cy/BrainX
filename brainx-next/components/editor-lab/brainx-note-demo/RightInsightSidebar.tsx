"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { cx } from "@/lib/utils";
import { type NoteData, MOCK_NOTES } from "./mockData";
import KnowledgeGraphMock from "./KnowledgeGraphMock";

interface Props {
  activeNote: NoteData;
  isLight: boolean;
  onSelectNote: (noteId: string) => void;
}

type SectionKey = "toc" | "backlinks" | "ai-suggestions" | "ai-chat" | "ask-note" | "frontmatter" | "graph";

function parseHeadings(content: string) {
  return content
    .split("\n")
    .map((line, i) => {
      const m = /^(#{1,4})\s+(.+)/.exec(line.trim());
      if (!m) return null;
      return { id: `${i}`, level: m[1].length, text: m[2] };
    })
    .filter(Boolean) as { id: string; level: number; text: string }[];
}

function SectionHeader({
  label,
  open,
  onToggle,
  accent = false,
  isLight,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  accent?: boolean;
  isLight: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={cx(
        "flex w-full items-center gap-1.5 text-[11px] font-semibold transition-colors py-1",
        accent
          ? "text-accent hover:text-accent/80"
          : isLight ? "text-slate-500 hover:text-slate-700" : "text-txt3 hover:text-txt"
      )}
    >
      <span className="flex-1 text-left">{label}</span>
      {open ? <ChevronDown size={12} className="shrink-0 opacity-60" /> : <ChevronRight size={12} className="shrink-0 opacity-60" />}
    </button>
  );
}

export default function RightInsightSidebar({ activeNote, isLight, onSelectNote }: Props) {
  const [sec, setSec] = useState<Record<SectionKey, boolean>>({
    toc: true,
    backlinks: true,
    "ai-suggestions": true,
    "ai-chat": true,
    "ask-note": false,
    frontmatter: false,
    graph: false,
  });
  const toggle = (k: SectionKey) => setSec((p) => ({ ...p, [k]: !p[k] }));

  /* AI chat state */
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; streaming?: boolean }[]>([
    { role: "ai", text: "이 노트에 대해 무엇이든 물어보세요. 연관 노트도 함께 찾아드려요." },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toc = useMemo(() => parseHeadings(activeNote.content), [activeNote.content]);

  const backlinkNotes = activeNote.backlinks
    .map((id) => MOCK_NOTES.find((n) => n.id === id))
    .filter(Boolean) as NoteData[];

  const outgoingNotes = activeNote.outgoingLinks
    .map((id) => MOCK_NOTES.find((n) => n.id === id))
    .filter(Boolean) as NoteData[];

  function sendAi(customQ?: string) {
    const q = customQ ?? aiInput.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setAiInput("");

    const answer = activeNote.aiSuggestions.length > 0
      ? `「${activeNote.title}」 노트 분석 완료.\n\n${activeNote.aiSuggestions.slice(0, 2).join(", ")} 등의 개념과 깊이 연결되어 있어요. 더 알아보려면 연관 노트를 열어보세요.`
      : `「${activeNote.title}」 노트를 분석했습니다. 더 많은 내용을 추가하면 AI 연결 제안이 생성됩니다.`;

    setMessages((m) => [...m, { role: "ai", text: "", streaming: true }]);
    let idx = 0;
    const timer = setInterval(() => {
      idx += 4;
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: "ai", text: answer.slice(0, idx), streaming: idx < answer.length };
        return next;
      });
      if (idx >= answer.length) {
        clearInterval(timer);
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 18);
  }

  return (
    <div className={cx(
      "flex w-64 shrink-0 flex-col border-l overflow-hidden",
      isLight ? "border-slate-200 bg-slate-50/80" : "border-line/50 bg-bg2/30"
    )}>
      {/* Header */}
      <div className={cx("flex items-center gap-2 border-b px-3 py-2.5", isLight ? "border-slate-200" : "border-line/50")}>
        <span className="text-accent text-[13px]">✦</span>
        <span className={cx("flex-1 truncate text-[11px] font-semibold", isLight ? "text-slate-600" : "text-txt3")}>
          {activeNote.title}
        </span>
      </div>

      {/* Scrollable sections */}
      <div className="scroll flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* TOC */}
        <div>
          <SectionHeader label="목차" open={sec.toc} onToggle={() => toggle("toc")} isLight={isLight} />
          {sec.toc && (
            <div className="mt-1 space-y-0.5">
              {toc.length > 0 ? toc.map((h) => (
                <div
                  key={h.id}
                  style={{ paddingLeft: (h.level - 1) * 10 + 6 }}
                  className={cx(
                    "flex h-6 cursor-pointer items-center truncate rounded-lg pr-2 text-[12px] transition-colors",
                    isLight ? "text-slate-600 hover:bg-white hover:text-primary" : "text-txt2 hover:bg-surface2/50 hover:text-primary"
                  )}
                >
                  {h.text}
                </div>
              )) : (
                <p className={cx("text-[11px] px-1.5", isLight ? "text-slate-400" : "text-txt3")}>
                  # 제목으로 목차를 만드세요
                </p>
              )}
            </div>
          )}
        </div>

        {/* Backlinks & Outgoing */}
        <div>
          <SectionHeader label="연결 · 백링크" open={sec.backlinks} onToggle={() => toggle("backlinks")} isLight={isLight} />
          {sec.backlinks && (
            <div className="mt-1 space-y-1">
              {outgoingNotes.map((n) => (
                <LinkRow key={n.id} note={n} direction="out" isLight={isLight} onOpen={() => onSelectNote(n.id)} />
              ))}
              {backlinkNotes.map((n) => (
                <LinkRow key={n.id} note={n} direction="in" isLight={isLight} onOpen={() => onSelectNote(n.id)} />
              ))}
              {outgoingNotes.length === 0 && backlinkNotes.length === 0 && (
                <p className={cx("text-[11px] px-1.5", isLight ? "text-slate-400" : "text-txt3")}>
                  [[노트 제목]] 으로 링크하세요
                </p>
              )}

              {/* Unlinked mentions mock */}
              <div className={cx("mt-2 pt-2 border-t", isLight ? "border-slate-200" : "border-line/30")}>
                <p className={cx("text-[10px] font-semibold mb-1", isLight ? "text-slate-400" : "text-txt3")}>미연결 언급 (1)</p>
                <div className={cx("rounded-lg p-2 text-[11px] cursor-pointer transition-colors", isLight ? "bg-white border border-slate-200 text-slate-600 hover:border-slate-300" : "bg-surface/60 border border-line/40 text-txt2 hover:border-line")}>
                  <span className="font-medium">RAG 챗봇 구조</span>
                  <span className={cx(isLight ? "text-slate-400" : "text-txt3")}> 에서 언급</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div>
          <SectionHeader label="AI 연결 제안" open={sec["ai-suggestions"]} onToggle={() => toggle("ai-suggestions")} accent isLight={isLight} />
          {sec["ai-suggestions"] && (
            <div className={cx("mt-1 rounded-xl border p-3", isLight ? "bg-purple-50/60 border-purple-200/60" : "bg-accent/[0.07] border-accent/20")}>
              {activeNote.aiSuggestions.length > 0 ? (
                <>
                  <p className={cx("mb-2 text-[12px] leading-relaxed", isLight ? "text-slate-700" : "text-txt2")}>
                    <b>「{activeNote.aiSuggestions[0]}」</b>
                    {activeNote.aiSuggestions.length > 1 ? ` 외 ${activeNote.aiSuggestions.length - 1}개` : ""}와 연관돼요.
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {activeNote.aiSuggestions.map((s) => (
                      <span key={s} className={cx("text-[10.5px] rounded-full border px-2 py-0.5", isLight ? "border-purple-200 bg-purple-50 text-purple-600" : "border-accent/25 bg-accent/10 text-accent")}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <button className={cx("w-full flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[12px] font-medium transition-colors", isLight ? "border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100" : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20")}>
                    + 연결 추가
                  </button>
                </>
              ) : (
                <p className={cx("text-[12px]", isLight ? "text-slate-500" : "text-txt2")}>분석 중...</p>
              )}
            </div>
          )}
        </div>

        {/* YAML Frontmatter */}
        <div>
          <SectionHeader label="속성 (Frontmatter)" open={sec.frontmatter} onToggle={() => toggle("frontmatter")} isLight={isLight} />
          {sec.frontmatter && (
            <div className="mt-1 space-y-1.5 text-[12px]">
              {[
                { key: "title", value: activeNote.title },
                { key: "created", value: activeNote.createdAt.slice(0, 10) },
                { key: "updated", value: activeNote.updatedAt.slice(0, 10) },
                { key: "status", value: activeNote.status },
                { key: "folder", value: activeNote.folder },
                { key: "tags", value: activeNote.tags.map((t) => `#${t}`).join(", ") },
              ].map(({ key, value }) => (
                <div key={key} className="flex items-start gap-2">
                  <span className={cx("w-14 shrink-0 font-mono text-[11px]", isLight ? "text-slate-400" : "text-txt3")}>{key}</span>
                  <span className={cx("flex-1 truncate", isLight ? "text-slate-700" : "text-txt2")}>{value}</span>
                </div>
              ))}
              <button className={cx("w-full text-left px-1 py-1 text-[11px] transition-colors", isLight ? "text-slate-400 hover:text-primary" : "text-txt3 hover:text-primary")}>
                + 필드 추가
              </button>
            </div>
          )}
        </div>

        {/* Local Graph */}
        <div>
          <SectionHeader label="로컬 그래프" open={sec.graph} onToggle={() => toggle("graph")} isLight={isLight} />
          {sec.graph && (
            <div className="mt-1">
              <KnowledgeGraphMock
                isLight={isLight}
                activeNoteId={activeNote.id}
                onSelectNote={onSelectNote}
                localGraph
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Chat (bottom fixed) */}
      <div className={cx("border-t flex flex-col", isLight ? "border-slate-200" : "border-line/50")}>
        <div className="px-3 py-2">
          <SectionHeader label="이 노트에 질문" open={sec["ai-chat"]} onToggle={() => toggle("ai-chat")} isLight={isLight} />
        </div>

        {sec["ai-chat"] && (
          <>
            {/* Quick questions */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1">
                {["요약해줘", "연관 주제는?", "태그 추천"].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendAi(q)}
                    className={cx(
                      "text-[10.5px] px-2 py-0.5 rounded-full border transition-all",
                      isLight ? "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary" : "border-line/40 text-txt3 hover:border-primary/40 hover:text-primary"
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="scroll max-h-40 overflow-y-auto px-3 space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cx(
                    "rounded-xl px-2.5 py-2 text-[12px] leading-relaxed",
                    msg.role === "user"
                      ? "ml-6 bg-primary/15 text-txt"
                      : isLight ? "mr-2 bg-slate-100 text-slate-700" : "mr-2 bg-surface2/50 text-txt2"
                  )}
                >
                  {msg.text}
                  {msg.streaming && <span className="inline-block w-1.5 h-3 bg-current ml-0.5 animate-pulse align-middle" />}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 p-3">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendAi(); }}
                placeholder="질문..."
                className={cx(
                  "h-8 flex-1 rounded-lg border text-[12px] px-2.5 outline-none",
                  isLight ? "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-primary/50" : "border-line/50 bg-surface2/60 text-txt placeholder:text-txt3 focus:border-primary/50"
                )}
              />
              <button
                onClick={() => sendAi()}
                className="h-8 w-8 shrink-0 grid place-items-center rounded-lg bg-primary text-white hover:brightness-110 transition-all"
              >
                ↑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LinkRow({
  note,
  direction,
  isLight,
  onOpen,
}: {
  note: NoteData;
  direction: "in" | "out";
  isLight: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className={cx(
        "flex items-center gap-2 cursor-pointer rounded-lg p-2 transition-colors",
        isLight ? "bg-white border border-slate-200 hover:border-slate-300" : "bg-surface/60 border border-line/40 hover:border-line"
      )}
    >
      <span className={cx("text-[11px] shrink-0", direction === "out" ? "text-cyan" : isLight ? "text-slate-400" : "text-txt3")}>
        {direction === "out" ? "→" : "←"}
      </span>
      <span className={cx("flex-1 truncate text-[12px] font-medium", isLight ? "text-slate-700" : "text-txt")}>
        {note.title}
      </span>
      <ExternalLink size={10} className={isLight ? "text-slate-300 shrink-0" : "text-txt3/50 shrink-0"} />
    </div>
  );
}
