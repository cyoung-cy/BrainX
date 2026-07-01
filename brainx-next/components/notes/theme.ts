/**
 * Split Demo 테마 시스템
 * BrainX globals.css의 CSS 변수를 재사용 — 하드코딩 금지.
 * html.light 클래스 토글만으로 자동 전환됨.
 */

export type SplitTheme = "dark" | "light"; // kept for compat

export interface ThemeTokens {
  // ── 배경 ──────────────────────────────────────
  bg: string;
  bgPanel: string;
  bgHeader: string;
  bgHeaderActive: string;
  bgStats: string;
  bgDebug: string;
  bgSidebar: string;
  bgCode: string;

  // ── 테두리 ─────────────────────────────────────
  border: string;
  borderActive: string;
  borderHeader: string;
  borderHeaderActive: string;
  borderCode: string;
  borderSep: string;
  borderSepHover: string;

  // ── 텍스트 ─────────────────────────────────────
  txtPrimary: string;
  txtH2: string;
  txtH3: string;
  txtBody: string;
  txtMuted: string;
  txtFaint: string;
  txtCode: string;
  txtBullet: string;

  // ── 컨트롤 ─────────────────────────────────────
  selectColor: string;
  selectColorInactive: string;
  tagBg: string;
  tagText: string;
  btnBorder: string;
  btnText: string;
  btnTextHover: string;
  btnBorderHover: string;
  closeText: string;
  closeBorder: string;
  closeBgHover: string;
  closeBorderHover: string;

  // ── 사이드바 ───────────────────────────────────
  sidebarBorder: string;
  sidebarItemBg: string;
  sidebarItemBgHover: string;
  sidebarItemText: string;
  sidebarItemTag: string;
  sidebarItemTagBg: string;

  // ── DnD 오버레이 ───────────────────────────────
  dndOverlayBg: string;
  dndZoneHover: string;
  dndZoneLabel: string;
}

/**
 * BrainX CSS 변수 기반 단일 테마.
 * globals.css: :root(dark) / html.light(light) 으로 자동 전환.
 *
 * dark  → bg=rgb(11 16 32)  surface=rgb(17 24 39)  primary=rgb(59 130 246)
 * light → bg=rgb(244 247 253) surface=rgb(255 255 255) primary=rgb(37 99 235)
 */
export const AUTO_THEME: ThemeTokens = {
  // ── 배경 ──
  bg:             "rgb(var(--bg))",
  bgPanel:        "rgb(var(--surface))",           // dark:#111827 / light:#ffffff
  bgHeader:       "rgb(var(--surface2) / 0.45)",
  bgHeaderActive: "rgb(var(--primary) / 0.07)",
  bgStats:        "rgb(var(--bg2))",
  bgDebug:        "rgb(var(--bg))",
  bgSidebar:      "rgb(var(--bg))",
  bgCode:         "rgb(var(--surface2))",

  // ── 테두리 ──
  border:             "rgb(var(--border) / 0.82)",
  borderActive:       "rgb(var(--primary))",
  borderHeader:       "rgb(var(--border) / 0.62)",
  borderHeaderActive: "rgb(var(--primary) / 0.3)",
  borderCode:         "rgb(var(--border) / 0.82)",
  borderSep:          "rgb(var(--border) / 0.62)",
  borderSepHover:     "rgb(var(--primary) / 0.4)",

  // ── 텍스트 ──
  txtPrimary: "rgb(var(--txt))",
  txtH2:      "rgb(var(--txt))",
  txtH3:      "rgb(var(--txt2))",
  txtBody:    "rgb(var(--txt2))",
  txtMuted:   "rgb(var(--txt3))",
  txtFaint:   "rgb(var(--border) / 0.8)",
  txtCode:    "rgb(var(--primary))",
  txtBullet:  "rgb(var(--accent))",

  // ── 컨트롤 ──
  selectColor:         "rgb(var(--txt))",
  selectColorInactive: "rgb(var(--txt3))",
  tagBg:          "rgb(var(--surface2))",
  tagText:        "rgb(var(--txt3))",
  btnBorder:      "rgb(var(--border) / 0.82)",
  btnText:        "rgb(var(--txt3))",
  btnTextHover:   "rgb(var(--primary))",
  btnBorderHover: "rgb(var(--primary) / 0.45)",
  closeText:        "rgb(239 68 68)",
  closeBorder:      "rgb(239 68 68 / 0.28)",
  closeBgHover:     "rgb(239 68 68 / 0.1)",
  closeBorderHover: "rgb(239 68 68 / 0.7)",

  // ── 사이드바 ──
  sidebarBorder:      "rgb(var(--border) / 0.62)",
  sidebarItemBg:      "transparent",
  sidebarItemBgHover: "rgb(var(--surface2) / 0.7)",
  sidebarItemText:    "rgb(var(--txt2))",
  sidebarItemTag:     "rgb(var(--txt3))",
  sidebarItemTagBg:   "rgb(var(--surface2))",

  // ── DnD ──
  dndOverlayBg: "rgb(var(--primary) / 0.05)",
  dndZoneHover: "rgb(var(--primary) / 0.13)",
  dndZoneLabel: "rgb(var(--primary))",
};

// 하위 호환성 (기존 DARK_THEME / LIGHT_THEME import 유지)
export const DARK_THEME  = AUTO_THEME;
export const LIGHT_THEME = AUTO_THEME;

export function getTheme(_mode?: SplitTheme): ThemeTokens {
  return AUTO_THEME;
}
