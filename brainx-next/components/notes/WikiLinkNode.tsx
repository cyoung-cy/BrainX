"use client";

import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { FilePlus2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { useWikiLinkContext, resolveWikiLinkTitle } from "./WikiLinkContext";

/** `[[노트]]` / `[[노트|별칭]]` / `[[노트#헤딩]]` / `[[노트#헤딩|별칭]]` 입력 형태를 그대로
    지원한다(Obsidian 문법). `]]`까지 입력하는 순간 nodeInputRule이 매치되어 이 노드로
    변환된다. */
function parseWikiLinkBody(raw: string) {
  const [titleAndHeading, aliasPart] = raw.split("|");
  const [title, heading] = titleAndHeading.split("#");
  return {
    title: title.trim(),
    heading: heading?.trim() || null,
    alias: aliasPart?.trim() || null,
  };
}

function WikiLinkView({ node }: NodeViewProps) {
  const ctx = useWikiLinkContext();
  const title = (node.attrs.title as string) ?? "";
  const alias = (node.attrs.alias as string | null) ?? null;
  const heading = (node.attrs.heading as string | null) ?? null;

  const resolved = ctx ? resolveWikiLinkTitle(ctx.notes, title) : null;
  const exists = !!resolved;
  const display = alias ?? title;

  const handleClick = () => {
    if (!ctx) return;
    if (exists) ctx.onNavigate(title);
    else ctx.onCreate(title);
  };

  return (
    <NodeViewWrapper as="span" className="inline">
      <button
        type="button"
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        title={exists ? `"${title}" 노트로 이동${heading ? ` (#${heading})` : ""}` : `"${title}" 노트가 없습니다 — 클릭해서 생성`}
        aria-label={exists ? `${title} 노트로 이동` : `${title} 노트 생성`}
        className={cx(
          "rounded px-0.5 align-baseline font-medium underline decoration-1 underline-offset-2 transition-colors",
          exists
            ? "text-primary decoration-primary/50 hover:bg-primary/10"
            : "text-orange-400 decoration-dashed decoration-orange-400/70 hover:bg-orange-400/10"
        )}
      >
        {!exists && <FilePlus2 size={11} className="mr-0.5 inline-block shrink-0 -translate-y-px" />}
        {display}
      </button>
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (attrs: { title: string; alias?: string | null; heading?: string | null }) => ReturnType;
    };
  }
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      title: { default: "" },
      alias: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-alias"),
        renderHTML: (attrs) => (attrs.alias ? { "data-alias": String(attrs.alias) } : {}),
      },
      heading: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-heading"),
        renderHTML: (attrs) => (attrs.heading ? { "data-heading": String(attrs.heading) } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-wiki-link]",
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            title: el.getAttribute("data-title") ?? "",
            alias: el.getAttribute("data-alias"),
            heading: el.getAttribute("data-heading"),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { title, alias } = node.attrs;
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-wiki-link": "true", "data-title": title }),
      `[[${alias ?? title}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView);
  },

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^[\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => parseWikiLinkBody(match[1]),
      }),
    ];
  },
});
