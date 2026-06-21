import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { BlockAlign, BlockWidthMode } from "./BlockControls";

export type TableColorPreset = "default" | "blue" | "emerald" | "amber" | "rose";
export type CellColorPreset = "none" | "yellow" | "green" | "blue" | "gray";

export interface TableDisplayAttrs {
  align: BlockAlign;
  widthMode: BlockWidthMode;
  widthPercent: number | null;
  tableColor: TableColorPreset;
  borderWidth: number;
}

export function activeTable(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      return { node, pos: $from.before(depth) };
    }
  }
  return null;
}

export function activeTableDisplayAttrs(editor: Editor): TableDisplayAttrs {
  const attrs = activeTable(editor)?.node.attrs ?? {};
  return {
    align: (attrs.align as BlockAlign) ?? "center",
    widthMode: (attrs.widthMode as BlockWidthMode) ?? "fit",
    widthPercent: (attrs.widthPercent as number | null) ?? null,
    tableColor: (attrs.tableColor as TableColorPreset) ?? "default",
    borderWidth: Number(attrs.borderWidth) || 1,
  };
}

export function updateActiveTableAttrs(editor: Editor, attrs: Partial<TableDisplayAttrs>) {
  const table = activeTable(editor);
  if (!table) return false;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, ...attrs })
  );
  return true;
}

function isCellNode(typeName: string) {
  return typeName === "tableCell" || typeName === "tableHeader";
}

/** 현재 선택이 가리키는 셀(들)의 속성을 갱신한다. 셀 여러 개를 드래그해 만든 CellSelection과,
    셀 안 텍스트를 선택/커서만 둔 일반 TextSelection 두 경우 모두 지원한다 — 버블 툴바(텍스트
    선택)와 TableToolbar(드래그 선택) 양쪽에서 같은 함수를 쓸 수 있게 하기 위함. */
export function updateSelectedCellsAttrs(editor: Editor, attrs: Record<string, unknown>) {
  const { selection } = editor.state;
  const tr = editor.state.tr;
  let changed = false;

  if (selection instanceof CellSelection) {
    selection.forEachCell((node, pos) => {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
      changed = true;
    });
  } else {
    const { $from } = selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (isCellNode(node.type.name)) {
        tr.setNodeMarkup($from.before(d), undefined, { ...node.attrs, ...attrs });
        changed = true;
        break;
      }
    }
  }

  if (changed) editor.view.dispatch(tr);
  return changed;
}

/** 현재 선택을 대표하는 셀 하나의 속성을 읽어 툴바에 active 상태를 표시하는 데 쓴다.
    CellSelection이면 anchor 셀을 대표로 삼는다(다중 셀이 서로 다른 값을 가져도 단순화). */
export function activeCellAttrs(editor: Editor): { background: CellColorPreset; align: BlockAlign } {
  const { selection } = editor.state;
  let node = null;

  if (selection instanceof CellSelection) {
    node = selection.$anchorCell.nodeAfter;
  } else {
    const { $from } = selection;
    for (let d = $from.depth; d >= 0; d--) {
      const n = $from.node(d);
      if (isCellNode(n.type.name)) {
        node = n;
        break;
      }
    }
  }

  const attrs = node?.attrs ?? {};
  return {
    background: (attrs.cellBackground as CellColorPreset) ?? "none",
    align: (attrs.cellAlign as BlockAlign) ?? "left",
  };
}
