"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { InitialTab } from "@/components/notes/NotesWorkspace";
import { getNoteById } from "@/lib/notes/mockNotes";

const NotesWorkspace = dynamic(() => import("@/components/notes/NotesWorkspace"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-[13px] text-txt3">노트 워크스페이스 로딩 중…</div>,
});

/**
 * /notes 와 /notes/[id]는 각각 다른 page 컴포넌트지만, 분할 뷰·다중 탭 같은 워크스페이스
 * 상태는 두 라우트 사이에서 끊기면 안 된다. page.tsx마다 NotesWorkspace를 새로 마운트하면
 * (예: 새 노트 생성 → onActiveNoteChange → router.replace로 /notes/[id]로 전환) 컴포넌트가
 * 통째로 리마운트되어 방금 만든 메모리상의 노트가 사라진다. 그래서 워크스페이스는 이 공유
 * layout에서 한 번만 마운트하고, 두 page.tsx는 빈 컴포넌트로 둔다.
 */
export default function NotesLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const id = pathname === "/notes" ? null : pathname.replace(/^\/notes\//, "");

  const initialTab: InitialTab = id && getNoteById(id) ? { kind: "note", noteId: id } : { kind: "start" };

  return (
    <>
      <NotesWorkspace
        initialTab={initialTab}
        persistKey="brainx_notes_workspace_v1"
        onActiveNoteChange={(noteId) => router.replace(`/notes/${noteId}`)}
      />
      {children}
    </>
  );
}
