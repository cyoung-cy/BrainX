import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const HeadingFoldKey = new PluginKey<Set<number>>("headingFold");

/**
 * 헤딩 접기/펼치기 Extension.
 * 각 H1~H4 앞에 ▼/▶ chevron 위젯을 추가하고
 * 접힌 헤딩 이후의 하위 블록을 `display:none`으로 숨긴다.
 * 위치는 document 변경 시 position mapping으로 유지된다.
 */
export const HeadingFold = Extension.create({
  name: "headingFold",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: HeadingFoldKey,

        state: {
          init: () => new Set<number>(),

          apply(tr, prev) {
            // 문서 변경 시 접힌 헤딩 위치를 mapping으로 추적
            const next = new Set<number>();
            for (const pos of prev) {
              const r = tr.mapping.mapResult(pos, 1);
              if (!r.deleted) next.add(r.pos);
            }

            // meta로 전달된 토글 처리
            const meta = tr.getMeta(HeadingFoldKey) as { pos: number } | undefined;
            if (meta !== undefined) {
              if (next.has(meta.pos)) next.delete(meta.pos);
              else next.add(meta.pos);
            }
            return next;
          },
        },

        props: {
          decorations(state) {
            const collapsed = HeadingFoldKey.getState(state)!;
            const decos: Decoration[] = [];
            const { doc } = state;

            // 문서에서 모든 heading 수집 (top-level만)
            const headings: { pos: number; level: number; size: number }[] = [];
            doc.forEach((node, offset) => {
              if (node.type.name === "heading") {
                headings.push({ pos: offset, level: node.attrs.level, size: node.nodeSize });
              }
            });

            for (let i = 0; i < headings.length; i++) {
              const h = headings[i];
              const isColl = collapsed.has(h.pos);

              // Chevron 위젯: heading 내부 맨 앞
              decos.push(
                Decoration.widget(
                  h.pos + 1,
                  (view, _getPos) => {
                    const btn = document.createElement("span");
                    btn.className = "hf-btn";
                    btn.setAttribute("data-hf", "true");
                    btn.setAttribute("aria-label", isColl ? "펼치기" : "접기");
                    // 에디터가 decoration을 실제 문서 문자로 취급하지 않도록
                    btn.setAttribute("contenteditable", "false");
                    btn.setAttribute("aria-hidden", "true");

                    // ChevronRight SVG (Lucide) — 회전으로 방향 표현
                    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                    svg.setAttribute("width", "14");
                    svg.setAttribute("height", "14");
                    svg.setAttribute("viewBox", "0 0 24 24");
                    svg.setAttribute("fill", "none");
                    svg.setAttribute("stroke", "currentColor");
                    svg.setAttribute("stroke-width", "1.75");
                    svg.setAttribute("stroke-linecap", "round");
                    svg.setAttribute("stroke-linejoin", "round");
                    svg.style.display = "block";
                    svg.style.transition = "transform 0.15s";
                    // 펼친 상태: ▼ 효과 (90도 회전), 접힌 상태: ▶ 효과 (0도)
                    svg.style.transform = isColl ? "rotate(0deg)" : "rotate(90deg)";

                    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                    poly.setAttribute("points", "9 18 15 12 9 6");
                    svg.appendChild(poly);
                    btn.appendChild(svg);

                    btn.addEventListener("mousedown", (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // h.pos = heading node start (NOT getPos() which returns widget pos h.pos+1)
                      view.dispatch(
                        view.state.tr.setMeta(HeadingFoldKey, { pos: h.pos })
                      );
                    });

                    return btn;
                  },
                  // key에 isColl 포함 → 상태 변경 시 DOM 재생성 강제
                  { side: -2, key: `hf-${h.pos}-${isColl ? 1 : 0}` }
                )
              );

              if (isColl) {
                // 접힌 범위: 현재 헤딩 끝 ~ 다음 동일/상위 레벨 헤딩 시작
                const rangeStart = h.pos + h.size;
                let rangeEnd = doc.content.size;

                for (let j = i + 1; j < headings.length; j++) {
                  if (headings[j].level <= h.level) {
                    rangeEnd = headings[j].pos;
                    break;
                  }
                }

                // 범위 내 top-level 블록을 숨김
                if (rangeEnd > rangeStart) {
                  doc.nodesBetween(rangeStart, rangeEnd, (node, pos) => {
                    if (pos >= rangeStart && pos < rangeEnd) {
                      decos.push(
                        Decoration.node(pos, pos + node.nodeSize, {
                          style: "display:none",
                        })
                      );
                    }
                    return false; // 자식 노드 재귀 금지
                  });
                }

                // 접힌 헤딩에 class 추가 (CSS로 ··· 표시)
                decos.push(
                  Decoration.node(h.pos, h.pos + h.size, {
                    class: "hf-heading-collapsed",
                  })
                );
              }
            }

            return DecorationSet.create(doc, decos);
          },
        },
      }),
    ];
  },
});
