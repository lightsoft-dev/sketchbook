/**
 * ComponentPalette — 추가 가능한 노드 팔레트. 클릭하면 선택 위치에 노드를 삽입한다.
 */

"use client";

import type { NodeId, NodeType } from "@/document/types";
import { useEditorStore } from "../state/store";

const ITEMS: { type: NodeType; label: string; icon: string }[] = [
  { type: "Frame", label: "Frame", icon: "▦" },
  { type: "Text", label: "Text", icon: "T" },
  { type: "Image", label: "Image", icon: "▣" },
  { type: "Button", label: "Button", icon: "▭" },
];

export function ComponentPalette() {
  const doc = useEditorStore((s) => s.doc);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const insertNode = useEditorStore((s) => s.insertNode);

  /** 삽입 대상 부모를 결정한다: 선택 노드가 Frame 이면 그 안, 아니면 부모, 없으면 루트. */
  function resolveParent(): NodeId {
    const sel = selectedIds[0];
    if (!sel) return doc.rootId;
    const node = doc.nodes[sel];
    if (!node) return doc.rootId;
    if (node.type === "Frame") return sel;
    return node.parentId ?? doc.rootId;
  }

  return (
    <div className="border-b border-neutral-200">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        추가
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-3">
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => insertNode(item.type, resolveParent())}
            className="flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-2 text-[13px] text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span className="text-neutral-400">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
