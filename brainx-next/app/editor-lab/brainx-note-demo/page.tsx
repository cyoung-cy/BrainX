"use client";

import dynamic from "next/dynamic";

const NoteDemoLayout = dynamic(
  () => import("@/components/editor-lab/brainx-note-demo/NoteDemoLayout"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100svh] items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent animate-pulse" />
          <p className="text-txt3 text-[13px]">BrainX Note Demo 로딩 중…</p>
        </div>
      </div>
    ),
  }
);

export default function BrainXNoteDemoPage() {
  return <NoteDemoLayout />;
}
