"use client";

import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import React, { useState } from "react";
import { ChevronRight } from "lucide-react";

/* ── React 뷰 컴포넌트 ────────────────────────────────── */

function ToggleNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const isOpen = (node.attrs.open as boolean) ?? true;
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState<string>((node.attrs.summary as string) ?? "토글");

  const toggleOpen = () => updateAttributes({ open: !isOpen });

  const handleSummaryBlur = () => {
    setEditingSummary(false);
    updateAttributes({ summary: summaryDraft.trim() || "토글" });
  };

  return (
    <NodeViewWrapper as="div" className="brainx-toggle" data-open={isOpen ? "true" : "false"}>
      <div className="brainx-toggle__header" contentEditable={false}>
        <button
          type="button"
          className="brainx-toggle__chevron"
          onClick={toggleOpen}
          aria-label={isOpen ? "접기" : "펼치기"}
        >
          <ChevronRight
            size={14}
            className="brainx-toggle__chevron-icon"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>

        {editingSummary && editor.isEditable ? (
          <input
            autoFocus
            className="brainx-toggle__summary-input"
            value={summaryDraft}
            onChange={(e) => setSummaryDraft(e.target.value)}
            onBlur={handleSummaryBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                handleSummaryBlur();
              }
            }}
          />
        ) : (
          <span
            className="brainx-toggle__summary"
            onClick={() => editor.isEditable && setEditingSummary(true)}
          >
            {(node.attrs.summary as string) || "토글"}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="brainx-toggle__content">
          <NodeViewContent as="div" />
        </div>
      )}
    </NodeViewWrapper>
  );
}

/* ── TipTap Node 정의 ─────────────────────────────────── */

export const ToggleNode = Node.create({
  name: "toggleNode",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": attrs.open ? "true" : "false" }),
      },
      summary: {
        default: "토글",
        parseHTML: (el) => el.getAttribute("data-summary") ?? "토글",
        renderHTML: (attrs) => ({ "data-summary": attrs.summary ?? "토글" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\/(?:토글|toggle)\s$/,
        handler: ({ range, chain }) => {
          chain()
            .deleteRange(range)
            .insertContent({
              type: "toggleNode",
              attrs: { open: true, summary: "토글" },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
      }),
    ];
  },
});
