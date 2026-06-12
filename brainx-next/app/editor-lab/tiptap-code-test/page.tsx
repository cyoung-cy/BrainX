"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const TipTapCodeEditor = dynamic(
  () => import("@/components/editor/TipTapCodeEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 rounded-xl bg-surface2/60" />
        <div className="h-16 rounded-xl bg-surface2/60" />
        <div className="h-96 rounded-xl bg-surface2/60" />
      </div>
    ),
  }
);

export default function TipTapCodeTestPage() {
  return (
    <div className="min-h-screen bg-bg text-txt" data-route>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-7">
          <Link
            href="/editor-lab"
            className="inline-flex items-center gap-1 text-sm text-txt3 hover:text-txt transition-colors"
          >
            ← Editor Lab
          </Link>
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-txt">
              TipTap Code Highlight Test
            </h1>
            <span className="text-[11px] text-txt3 bg-surface2 px-2.5 py-1 rounded-full border border-line/30 mb-0.5">
              실험용 · 백엔드 미연결
            </span>
          </div>
          <p className="text-txt3 text-sm mt-2 leading-relaxed">
            CodeBlockLowlight + lowlight (highlight.js) 기반 ·{" "}
            <code className="text-primary text-xs font-mono bg-primary/10 px-1.5 py-0.5 rounded">
              ```
            </code>{" "}
            입력으로 코드블록 생성 · 40개 이상 언어 하이라이팅 확인
          </p>
        </div>

        <TipTapCodeEditor />
      </div>
    </div>
  );
}
