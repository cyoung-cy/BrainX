import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    fontFamily: {
      setFontFamily: (family: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

/** 글자 크기 — 새 패키지(`@tiptap/extension-font-size`) 없이, 이미 설치된
    `@tiptap/extension-text-style`의 `textStyle` mark에 `fontSize` 속성을 추가하는 방식으로
    구현했다. `Color`가 정확히 같은 패턴(같은 mark에 `color` 속성 추가)으로 이미 동작하고
    있어서, `style` 속성이 `mergeAttributes`에 의해 `color: ...; font-size: ...`처럼 자동으로
    합쳐진다(TipTap core가 style/class는 합치도록 특별 처리함) — 별도 패키지 설치 없이 공식
    확장과 동일한 결과를 낸다. */
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** 글꼴 — FontSize와 동일한 방식(textStyle mark 속성 추가). */
export const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontFamily || null,
            renderHTML: (attributes: { fontFamily?: string | null }) =>
              attributes.fontFamily ? { style: `font-family: ${attributes.fontFamily}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily:
        (family: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily: family }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    };
  },
});

export const FONT_SIZE_PRESETS = ["12px", "14px", "16px", "18px", "24px"];

export const FONT_FAMILY_PRESETS: { label: string; value: string | null }[] = [
  { label: "기본", value: null },
  { label: "Pretendard", value: "var(--font-sans, Pretendard, sans-serif)" },
  { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "var(--font-mono, ui-monospace, monospace)" },
];
