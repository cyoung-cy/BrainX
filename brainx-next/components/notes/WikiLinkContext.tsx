"use client";

import { createContext, useContext } from "react";

export interface WikiLinkNoteRef {
  id: string;
  title: string;
}

export interface WikiLinkContextValue {
  /** 자동완성 목록/존재 여부 확인에 쓰는 전체 노트 제목 목록(가벼운 참조만). */
  notes: WikiLinkNoteRef[];
  /** 제목으로 노트를 찾는다 — 정확히 일치하는 제목이 없으면, 그 제목을 포함하는 노트가
      유일할 때만 그 노트로 간주한다("Spring"만 입력해도 "Spring 정리"를 찾아주는 식 —
      Obsidian의 퍼지 매칭과 비슷한 타협, 단순 텍스트 치환이 아니라 실제 노트 목록을 본다). */
  resolveTitle: (title: string) => WikiLinkNoteRef | null;
  /** 존재하는 노트로 이동(활성 패널에 연다). */
  onNavigate: (title: string) => void;
  /** 존재하지 않는 노트를 그 제목으로 즉시 생성하고 연다. */
  onCreate: (title: string) => void;
}

export const WikiLinkContext = createContext<WikiLinkContextValue | null>(null);

export function useWikiLinkContext() {
  return useContext(WikiLinkContext);
}

/** 정확히 일치 → 부분 일치(유일할 때만) 순서로 찾는다. 공유 로직이라 Context value를 만드는
    쪽(NotesWorkspace)과 자동완성 쪽(WikiLinkAutocomplete) 모두 이 함수를 쓴다. */
export function resolveWikiLinkTitle(notes: WikiLinkNoteRef[], title: string): WikiLinkNoteRef | null {
  const needle = title.trim().toLowerCase();
  if (!needle) return null;
  const exact = notes.find((n) => n.title.toLowerCase() === needle);
  if (exact) return exact;
  const partial = notes.filter((n) => n.title.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}
