import type { Editor } from "@tiptap/core";
import type { BlockAlign, BlockWidthMode } from "./BlockControls";

export type TableColorPreset = "default" | "blue" | "emerald" | "amber" | "rose";

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
