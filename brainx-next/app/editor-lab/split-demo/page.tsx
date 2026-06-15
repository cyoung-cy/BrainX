"use client";

import dynamic from "next/dynamic";
import { WorkspaceShell } from "@/components/workspace-shell";

const SplitDemoClient = dynamic(
  () => import("@/components/editor/split-demo/SplitDemoClient"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-[13px] text-txt3">
        Split View 로딩 중…
      </div>
    ),
  }
);

export default function SplitDemoPage() {
  return (
    <WorkspaceShell>
      <SplitDemoClient />
    </WorkspaceShell>
  );
}
