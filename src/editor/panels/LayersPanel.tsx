/**
 * LayersPanel — 좌측 레이어 트리. 노드 계층을 보여주고 선택/삭제를 제공한다.
 */

"use client";

import { walk } from "@sketchbook/renderer";
import type { NodeId, NodeType } from "@sketchbook/renderer";
import { useEditorStore } from "../state/store";

const TYPE_ICON: Record<NodeType, string> = {
  Frame: "▦",
  Text: "T",
  Image: "▣",
  Button: "▭",
};

export function LayersPanel() {
  const doc = useEditorStore((s) => s.doc);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const select = useEditorStore((s) => s.select);
  const setHovered = useEditorStore((s) => s.setHovered);
  const deleteNode = useEditorStore((s) => s.deleteNode);

  const rows: { id: NodeId; depth: number }[] = [];
  walk(doc.nodes, doc.rootId, (node, depth) => rows.push({ id: node.id, depth }));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        레이어
      </div>
      <div className="flex-1 overflow-auto py-1">
        {rows.map(({ id, depth }) => {
          const node = doc.nodes[id];
          const selected = selectedIds.includes(id);
          return (
            <div
              key={id}
              onClick={() => select(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className={`group flex cursor-default items-center gap-1.5 py-1 pr-2 text-[13px] ${
                selected
                  ? "bg-indigo-50 text-indigo-700"
                  : hoveredId === id
                    ? "bg-neutral-100 text-neutral-700"
                    : "text-neutral-600"
              }`}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              <span className="w-3.5 text-center text-[11px] text-neutral-400">
                {TYPE_ICON[node.type]}
              </span>
              <span className="flex-1 truncate">{node.name}</span>
              {id !== doc.rootId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(id);
                  }}
                  className="hidden text-neutral-400 hover:text-red-500 group-hover:block"
                  title="삭제"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
