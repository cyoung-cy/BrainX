"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cx } from "@/lib/utils";

/** 접기/펼치기 화살표를 프로젝트 전체에서 한 패턴으로 통일하기 위한 공유 컴포넌트.
    펼침: ChevronDown(▼), 접힘: ChevronRight(▶) — NotesExplorer/FolderTree/RightSidebar가
    이미 전부 이 두 아이콘을 쓰고 있었지만 각자 따로 구현돼 있어 한 곳으로 모았다. 헤딩
    폴딩(`headingFold.ts`)은 ProseMirror decoration 위젯이라 React 컴포넌트를 못 쓰는
    대신, 동일한 ChevronRight 패스 데이터를 그대로 그려서 시각적으로는 이미 같은 모양이다. */
export function CollapseChevron({
  expanded,
  size = 11,
  className,
}: {
  expanded: boolean;
  size?: number;
  className?: string;
}) {
  return expanded ? (
    <ChevronDown size={size} className={cx("shrink-0 text-txt3", className)} />
  ) : (
    <ChevronRight size={size} className={cx("shrink-0 text-txt3", className)} />
  );
}
