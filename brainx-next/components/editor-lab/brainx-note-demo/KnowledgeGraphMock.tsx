"use client";

import { useState, useEffect } from "react";
import { cx } from "@/lib/utils";
import { MOCK_NOTES } from "./mockData";

interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  r: number;
  color: string;
  tags: string[];
}

interface GraphEdge {
  source: string;
  target: string;
}

/* Tag → color map */
const TAG_COLORS: Record<string, string> = {
  architecture: "#3b82f6",
  frontend: "#22d3ee",
  ai: "#8b5cf6",
  research: "#f59e0b",
  backend: "#10b981",
  obsidian: "#a855f7",
  msa: "#3b82f6",
  editor: "#22d3ee",
  rag: "#8b5cf6",
  notion: "#f59e0b",
  spring: "#10b981",
};

function getNodeColor(tags: string[]): string {
  for (const tag of tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return "#64748b";
}

/* Stable pseudo-random positions using note id */
function hashPosition(id: string, seed: number, max: number): number {
  let h = seed;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 10007;
  }
  return (h % max);
}

const W = 460;
const H = 300;

function buildGraph(activeNoteId: string | null): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = MOCK_NOTES.map((n) => {
    const linkCount = n.backlinks.length + n.outgoingLinks.length;
    return {
      id: n.id,
      title: n.title,
      x: 40 + hashPosition(n.id, 1, W - 80),
      y: 40 + hashPosition(n.id, 2, H - 80),
      r: 8 + Math.min(linkCount * 3, 14),
      color: getNodeColor(n.tags),
      tags: n.tags,
    };
  });

  const edges: GraphEdge[] = [];
  MOCK_NOTES.forEach((n) => {
    n.outgoingLinks.forEach((t) => {
      if (MOCK_NOTES.find((x) => x.id === t)) {
        edges.push({ source: n.id, target: t });
      }
    });
  });

  return { nodes, edges };
}

interface Props {
  isLight: boolean;
  activeNoteId: string | null;
  onSelectNote?: (noteId: string) => void;
  localGraph?: boolean;
}

export default function KnowledgeGraphMock({
  isLight,
  activeNoteId,
  onSelectNote,
  localGraph = false,
}: Props) {
  const [depth, setDepth] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { nodes: allNodes, edges: allEdges } = buildGraph(activeNoteId);

  // Local graph: only show nodes connected to active note within depth
  const visibleNodeIds = new Set<string>();
  if (localGraph && activeNoteId) {
    visibleNodeIds.add(activeNoteId);
    const activeNote = MOCK_NOTES.find((n) => n.id === activeNoteId);
    if (activeNote) {
      const connected = [...activeNote.backlinks, ...activeNote.outgoingLinks];
      connected.forEach((id) => {
        visibleNodeIds.add(id);
        if (depth >= 2) {
          const note2 = MOCK_NOTES.find((n) => n.id === id);
          note2?.outgoingLinks.forEach((id2) => visibleNodeIds.add(id2));
          note2?.backlinks.forEach((id2) => visibleNodeIds.add(id2));
        }
      });
    }
  } else {
    allNodes.forEach((n) => visibleNodeIds.add(n.id));
  }

  const nodes = allNodes.filter((n) => visibleNodeIds.has(n.id));
  const edges = allEdges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className={cx(
      "rounded-xl border overflow-hidden",
      isLight ? "bg-white border-slate-200" : "bg-surface2/50 border-line/40"
    )}>
      {/* Controls */}
      <div className={cx(
        "flex items-center gap-2 px-3 py-2 border-b",
        isLight ? "border-slate-200 bg-slate-50" : "border-line/40"
      )}>
        <span className={cx("text-[11px] font-semibold", isLight ? "text-slate-600" : "text-txt2")}>
          {localGraph ? "로컬 그래프" : "전체 그래프"}
        </span>
        <div className="flex-1" />
        {/* Search */}
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="노드 검색..."
          className={cx(
            "w-24 h-6 px-2 rounded text-[11px] border outline-none",
            isLight ? "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400" : "border-line/40 bg-surface text-txt2 placeholder:text-txt3"
          )}
        />
        {/* Depth slider (local only) */}
        {localGraph && (
          <div className="flex items-center gap-1.5">
            <span className={cx("text-[10px]", isLight ? "text-slate-400" : "text-txt3")}>Depth</span>
            <input
              type="range"
              min={1}
              max={3}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-16 h-1 accent-primary"
            />
            <span className={cx("text-[10px] w-3 text-center", isLight ? "text-slate-500" : "text-txt2")}>{depth}</span>
          </div>
        )}
      </div>

      {/* SVG Graph */}
      <div className="relative" style={{ height: H }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const s = nodeMap.get(e.source);
            const t = nodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={i}
                x1={s.x} y1={s.y}
                x2={t.x} y2={t.y}
                stroke={isLight ? "rgba(148,163,184,0.5)" : "rgba(71,85,105,0.5)"}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isActive = node.id === activeNoteId;
            const isHovered = node.id === hovered;
            const isSearchMatch = searchQuery && node.title.toLowerCase().includes(searchQuery.toLowerCase());
            const opacity = searchQuery && !isSearchMatch ? 0.2 : 1;

            return (
              <g
                key={node.id}
                style={{ cursor: "pointer", opacity }}
                onClick={() => onSelectNote?.(node.id)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow ring for active */}
                {(isActive || isHovered) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 5}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2}
                    opacity={0.4}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={node.color}
                  fillOpacity={isActive ? 1 : 0.75}
                  stroke={isActive ? "#fff" : "none"}
                  strokeWidth={2}
                />
                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + node.r + 11}
                  textAnchor="middle"
                  fontSize={9}
                  fill={isLight ? "#64748b" : "#94a3b8"}
                  fontFamily="var(--font-sans)"
                >
                  {node.title.slice(0, 14)}{node.title.length > 14 ? "…" : ""}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && nodeMap.get(hovered) && (
          <div
            className={cx(
              "absolute bottom-2 left-2 pointer-events-none rounded-lg px-2.5 py-1.5 text-[11px] border shadow-soft",
              isLight ? "bg-white border-slate-200 text-slate-700" : "bg-surface2 border-line/60 text-txt2"
            )}
          >
            <div className="font-medium">{nodeMap.get(hovered)!.title}</div>
            <div className={cx("text-[10px]", isLight ? "text-slate-400" : "text-txt3")}>
              클릭하여 노트 열기
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={cx("flex flex-wrap gap-2 px-3 py-2 border-t", isLight ? "border-slate-100" : "border-line/30")}>
        {Object.entries(TAG_COLORS).slice(0, 5).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className={cx("text-[10px]", isLight ? "text-slate-400" : "text-txt3")}>#{tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
