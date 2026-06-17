"use client";

import dynamic from "next/dynamic";
import { WorkspaceShell } from "@/components/workspace-shell";
import { MOCK_NOTES } from "@/lib/notes/mockNotes";

const NotesWorkspace = dynamic(
  () => import("@/components/notes/NotesWorkspace"),
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
      <NotesWorkspace initialTab={{ kind: "note", noteId: MOCK_NOTES[0].id }} />
    </WorkspaceShell>
  );
}
