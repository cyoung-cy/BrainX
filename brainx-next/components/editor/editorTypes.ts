export type EditorFontSize = "sm" | "md" | "lg" | "xl";

export const FONT_SIZES: Record<EditorFontSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
};

export const FONT_SIZE_LABELS: Record<EditorFontSize, string> = {
  sm: "소",
  md: "중",
  lg: "대",
  xl: "특대",
};
