import type { AiTextSlice } from "./types";

const BLOCK_CLOSE_TAG_RE = /<\/(p|div|h[1-6]|li|blockquote|pre|tr)>/gi;
const BR_TAG_RE = /<br\s*\/?>/gi;

export function normalizeNoteContentForAi(content: string) {
  const raw = content ?? "";
  const htmlLike = /<\/?[a-z][\s\S]*>/i.test(raw.trim());
  const normalized = htmlLike ? htmlToMarkdownLikeText(raw) : raw;
  return normalizeLineEndings(decodeHtmlEntities(normalized))
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function limitAiText(text: string, maxChars: number, from = 0): AiTextSlice {
  const normalized = normalizeLineEndings(text ?? "").trim();
  if (normalized.length <= maxChars) {
    return {
      text: normalized,
      metadata: { sourceRange: { from, to: from + normalized.length } },
    };
  }

  const nextText = normalized.slice(0, maxChars).trimEnd();
  return {
    text: nextText,
    truncated: true,
    metadata: {
      sourceRange: { from, to: from + nextText.length },
      originalLength: normalized.length,
    },
  };
}

export function sampleLongAiText(text: string, maxChars: number): AiTextSlice {
  const normalized = normalizeLineEndings(text ?? "").trim();
  if (normalized.length <= maxChars) {
    return {
      text: normalized,
      metadata: { sourceRange: { from: 0, to: normalized.length } },
    };
  }

  const separator = "\n\n[...]\n\n";
  const available = Math.max(0, maxChars - separator.length * 2);
  const headLength = Math.floor(available * 0.45);
  const middleLength = Math.floor(available * 0.2);
  const tailLength = Math.max(0, available - headLength - middleLength);
  const middleStart = Math.max(headLength, Math.floor((normalized.length - middleLength) / 2));
  const tailStart = Math.max(middleStart + middleLength, normalized.length - tailLength);

  const head = normalized.slice(0, headLength).trimEnd();
  const middle = normalized.slice(middleStart, middleStart + middleLength).trim();
  const tail = normalized.slice(tailStart).trimStart();

  return {
    text: [head, middle, tail].filter(Boolean).join(separator),
    truncated: true,
    metadata: {
      sourceRanges: [
        { from: 0, to: head.length },
        { from: middleStart, to: middleStart + middle.length },
        { from: tailStart, to: normalized.length },
      ],
      originalLength: normalized.length,
    },
  };
}

function htmlToMarkdownLikeText(html: string) {
  return html
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, inner: string) => {
      return `\n${"#".repeat(Number(level))} ${inlineHtmlToMarkdown(inner).trim()}\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, inner: string) => {
      return `\n- ${inlineHtmlToMarkdown(inner).trim()}`;
    })
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, inner: string) => {
      return inlineHtmlToMarkdown(inner)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    })
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, code: string) => {
      return `\n\`\`\`\n${stripTags(code).trim()}\n\`\`\`\n`;
    })
    .replace(BR_TAG_RE, "\n")
    .replace(BLOCK_CLOSE_TAG_RE, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function inlineHtmlToMarkdown(html: string) {
  return html
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag: string, inner: string) => `**${stripTags(inner)}**`)
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag: string, inner: string) => `*${stripTags(inner)}*`)
    .replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag: string, inner: string) => `~~${stripTags(inner)}~~`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_match, inner: string) => `\`${stripTags(inner)}\``)
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href: string, inner: string) => {
      return `[${stripTags(inner)}](${href})`;
    })
    .replace(BR_TAG_RE, "\n")
    .replace(/<[^>]+>/g, "");
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
