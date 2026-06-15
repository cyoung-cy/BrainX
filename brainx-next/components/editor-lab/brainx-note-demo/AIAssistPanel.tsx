"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/utils";
import type { AiAction } from "./mockApi";

interface Props {
  selectedText: string;
  noteTitle: string;
  isLight: boolean;
  onClose: () => void;
  onApplyResult: (text: string) => void;
}

const AI_ACTIONS: { id: AiAction; label: string; icon: string }[] = [
  { id: "summarize", label: "요약하기", icon: "📋" },
  { id: "translate", label: "번역하기", icon: "🌐" },
  { id: "rewrite", label: "다시 쓰기", icon: "✏️" },
  { id: "shorter", label: "더 짧게", icon: "↙" },
  { id: "longer", label: "더 길게", icon: "↗" },
  { id: "correct-grammar", label: "문법 교정", icon: "✓" },
  { id: "explain", label: "설명 추가", icon: "💬" },
  { id: "suggest-tags", label: "태그 추천", icon: "#" },
];

const MOCK_RESPONSES: Record<AiAction, string> = {
  summarize: "핵심 내용: 이 노트는 BrainX의 주요 기능과 아키텍처를 다루고 있으며, MSA 기반의 설계와 AI 기능 통합 방향을 설명합니다.",
  translate: "This note covers BrainX's core features and architecture, explaining the MSA-based design and AI feature integration directions.",
  rewrite: "BrainX는 AI 기반 지식 관리 플랫폼으로, 마이크로서비스 아키텍처를 통해 확장성을 높이고 사용자 경험을 개선합니다.",
  shorter: "BrainX: AI 기반 MSA 지식 관리 플랫폼.",
  longer: "BrainX는 AI 기반 개인 지식 관리 플랫폼으로, 마이크로서비스 아키텍처를 채택하여 각 도메인을 독립적으로 배포하고 확장할 수 있습니다. 주요 서비스로는 노트 서비스, AI 서비스, 그래프 서비스, 검색 서비스가 있으며, 이들은 Kafka를 통해 이벤트 기반으로 통신합니다.",
  "correct-grammar": "교정 완료: 문법 오류 0개, 맞춤법 1개 수정되었습니다.",
  explain: "이 내용은 소프트웨어 아키텍처 패턴 중 하나인 MSA(마이크로서비스 아키텍처)를 BrainX 플랫폼에 적용한 방법을 설명합니다. 각 서비스가 독립적으로 배포되어 장애 격리와 확장성이 뛰어납니다.",
  "suggest-tags": "#architecture #msa #spring-boot #ai #knowledge-management #brainx",
};

export default function AIAssistPanel({
  selectedText,
  noteTitle,
  isLight,
  onClose,
  onApplyResult,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AiAction | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [aiDown, setAiDown] = useState(false);

  async function runAction(action: AiAction) {
    setActiveAction(action);
    setResult(null);
    setStreamText("");
    setLoading(true);
    setAiDown(false);

    // Simulate occasional AI downtime (10% chance)
    if (Math.random() < 0.1) {
      await new Promise((r) => setTimeout(r, 600));
      setAiDown(true);
      setLoading(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 400));
    const finalText = MOCK_RESPONSES[action];
    setLoading(false);

    // Stream effect
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx += 4;
      setStreamText(finalText.slice(0, idx));
      if (idx >= finalText.length) {
        clearInterval(timerRef.current!);
        setResult(finalText);
        setStreamText("");
      }
    }, 20);
  }

  const displayText = result ?? (streamText || null);

  return (
    <div
      className={cx(
        "rounded-2xl border shadow-soft overflow-hidden w-80",
        isLight ? "bg-white border-slate-200" : "bg-surface2 border-line/60"
      )}
    >
      {/* Header */}
      <div className={cx(
        "flex items-center gap-2 px-4 py-3 border-b",
        isLight ? "border-slate-200 bg-slate-50" : "border-line/40"
      )}>
        <span className="text-accent text-[14px]">✦</span>
        <span className={cx("text-[13px] font-semibold flex-1", isLight ? "text-slate-700" : "text-txt")}>
          AI 도움
        </span>
        <span className={cx("text-[11px] truncate max-w-[100px]", isLight ? "text-slate-400" : "text-txt3")}>
          {noteTitle}
        </span>
        <button onClick={onClose} className={isLight ? "text-slate-400 hover:text-slate-600" : "text-txt3 hover:text-txt"}>
          <X size={15} />
        </button>
      </div>

      {/* AI 장애 알림 */}
      {aiDown && (
        <div className={cx(
          "mx-3 mt-3 rounded-xl p-3 text-[12px] leading-relaxed",
          isLight ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
        )}>
          현재 AI 서비스 점검 중입니다. 노트 작성, 저장, 검색은 정상적으로 사용할 수 있습니다.
        </div>
      )}

      {/* Selected text preview */}
      {selectedText && (
        <div className={cx(
          "mx-3 mt-3 rounded-lg p-2.5 text-[12px] border-l-2 border-accent",
          isLight ? "bg-slate-50 text-slate-600" : "bg-surface/60 text-txt3"
        )}>
          <div className={cx("text-[10px] mb-1 font-semibold", isLight ? "text-slate-400" : "text-txt3/70")}>
            선택된 텍스트
          </div>
          <p className="line-clamp-2">{selectedText}</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {AI_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => runAction(action.id)}
            disabled={loading}
            className={cx(
              "flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] transition-all border",
              activeAction === action.id
                ? "border-accent/50 bg-accent/10 text-accent"
                : isLight
                  ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  : "border-line/40 bg-surface/60 text-txt2 hover:border-line hover:bg-surface2",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-[16px] leading-none">{action.icon}</span>
            <span className="text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Result */}
      {(displayText || loading) && (
        <div className={cx("mx-3 mb-3 rounded-xl p-3 border", isLight ? "bg-slate-50 border-slate-200" : "bg-surface/60 border-line/40")}>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className={cx("text-[12px]", isLight ? "text-slate-400" : "text-txt3")}>AI 분석 중...</span>
            </div>
          ) : (
            <>
              <p className={cx("text-[12.5px] leading-relaxed", isLight ? "text-slate-700" : "text-txt2")}>
                {displayText}
              </p>
              {result && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { onApplyResult(result); onClose(); }}
                    className="flex-1 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-white hover:brightness-110 transition-all"
                  >
                    적용하기
                  </button>
                  <button
                    onClick={() => { setResult(null); setActiveAction(null); }}
                    className={cx(
                      "px-3 py-1.5 rounded-lg text-[12px] border transition-all",
                      isLight ? "border-slate-200 text-slate-500 hover:bg-slate-100" : "border-line/40 text-txt3 hover:bg-surface2"
                    )}
                  >
                    취소
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
