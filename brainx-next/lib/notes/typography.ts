import type { CSSProperties } from "react";
import type { NoteTypography } from "./noteTypes";

/** 에디터 본문 wrapper는 항상 `split-pane-editor` 클래스를 함께 갖고 있어(NoteEditor.tsx),
    더 높은 specificity의 `.split-pane-editor.tiptap-note-content .ProseMirror` 규칙(0.8125rem)이
    `.tiptap-note-content .ProseMirror`(0.9375rem)를 항상 덮어쓴다 — 실제 기본 본문 크기는
    13px다. h1/h2/h3는 그 13px 기준 em 비율(1.8/1.35/1.1)이 실제 렌더링 값과 일치한다.
    scalePercent 계산의 출발점이므로, 여기 값을 바꾸면 CSS 쪽 기본값과 어긋난다. */
export const TYPOGRAPHY_BASE_PX = {
  body: 13, // 0.8125rem * 16px
  h1: 23.4, // 13 * 1.8
  h2: 17.55, // 13 * 1.35
  h3: 14.3, // 13 * 1.1
} as const;

export const TYPOGRAPHY_SCALE_MIN = 80;
export const TYPOGRAPHY_SCALE_MAX = 150;

/** scalePercent + 레벨별 overrides를 합쳐 최종 px 값을 계산한다.
    overrides에 값이 있는 레벨은 scalePercent 계산을 무시하고 그 값을 그대로 쓴다 — 전역 배율과
    개별 설정이 서로 독립적으로 동작해야 한다는 요구사항(개별 설정은 전역 배율 변경에 영향받지 않음). */
export function computeTypographyPx(typography?: NoteTypography) {
  const scale = (typography?.scalePercent ?? 100) / 100;
  const ov = typography?.overrides ?? {};
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    body: ov.body ?? round(TYPOGRAPHY_BASE_PX.body * scale),
    h1: ov.h1 ?? round(TYPOGRAPHY_BASE_PX.h1 * scale),
    h2: ov.h2 ?? round(TYPOGRAPHY_BASE_PX.h2 * scale),
    h3: ov.h3 ?? round(TYPOGRAPHY_BASE_PX.h3 * scale),
  };
}

/** typography 설정이 없으면(아무것도 커스터마이징하지 않은 노트) 빈 객체를 반환해 globals.css의
    기존 em 기반 기본값(var(--note-fs-h1, 1.8em) 등)이 그대로 적용되게 한다 — 기본 노트의 모양은
    이 기능 도입 전과 100% 동일하게 유지된다. */
export function typographyCssVars(typography?: NoteTypography): CSSProperties {
  if (!typography || (!typography.scalePercent && !typography.overrides && !typography.fontFamily)) {
    return {};
  }
  const px = computeTypographyPx(typography);
  const vars: Record<string, string> = {
    "--note-fs-body": `${px.body}px`,
    "--note-fs-h1": `${px.h1}px`,
    "--note-fs-h2": `${px.h2}px`,
    "--note-fs-h3": `${px.h3}px`,
  };
  if (typography.fontFamily) vars["--note-font-family"] = typography.fontFamily;
  return vars as CSSProperties;
}
