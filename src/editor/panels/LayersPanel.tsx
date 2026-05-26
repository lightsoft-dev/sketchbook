/**
 * LayersPanel — 좌측 레이어 트리. 노드 계층 표시 + 선택 + 드래그 순서 변경 + 삭제.
 *
 * dnd-kit 사용. 각 Frame 노드가 자체 SortableContext 를 가져 자식들끼리 드래그 순서 변경.
 * MVP: 같은 부모 내 reorder 만(다른 부모로 옮기는 cross-parent move 는 추후).
 */

"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const reorderChild = useEditorStore((s) => s.reorderChild);

  // 5px 움직여야 드래그 시작 — 클릭(선택)과 드래그를 구분.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = doc.nodes[String(active.id)];
    const b = doc.nodes[String(over.id)];
    if (!a || !b || !a.parentId) return;
    // MVP: 같은 부모 내 reorder 만.
    if (a.parentId !== b.parentId) return;
    const parent = doc.nodes[a.parentId];
    if (parent.type !== "Frame") return;
    const siblings = parent.children;
    const oldIdx = siblings.indexOf(a.id);
    const newIdx = siblings.indexOf(b.id);
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
    reorderChild(a.parentId, oldIdx, newIdx);
  };

  return (
    <DndContext
      id="sketchbook-layers"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-neutral-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          레이어
        </div>
        <div className="flex-1 overflow-auto py-1">
          <NodeRow id={doc.rootId} depth={0} dragDisabled />
        </div>
      </div>
    </DndContext>
  );
}

function NodeRow({
  id,
  depth,
  dragDisabled = false,
}: {
  id: NodeId;
  depth: number;
  dragDisabled?: boolean;
}) {
  const node = useEditorStore((s) => s.doc.nodes[id]);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const select = useEditorStore((s) => s.select);
  const setHovered = useEditorStore((s) => s.setHovered);
  const deleteNode = useEditorStore((s) => s.deleteNode);

  const sortable = useSortable({ id, disabled: dragDisabled });

  if (!node) return null;
  const selected = selectedIds.includes(id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    paddingLeft: 8 + depth * 14,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  return (
    <>
      <div
        ref={sortable.setNodeRef}
        style={style}
        {...sortable.attributes}
        {...sortable.listeners}
        onClick={() => select(id)}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
        className={`group flex items-center gap-1.5 py-1 pr-2 text-[13px] ${
          dragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        } ${
          selected
            ? "bg-indigo-50 text-indigo-700"
            : hoveredId === id
              ? "bg-neutral-100 text-neutral-700"
              : "text-neutral-600"
        }`}
      >
        <span className="w-3.5 text-center text-[11px] text-neutral-400">
          {TYPE_ICON[node.type]}
        </span>
        <span className="flex-1 truncate">{node.name}</span>
        {!dragDisabled && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
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
      {node.children.length > 0 && (
        <SortableContext
          items={node.children}
          strategy={verticalListSortingStrategy}
        >
          {node.children.map((cid) => (
            <NodeRow key={cid} id={cid} depth={depth + 1} />
          ))}
        </SortableContext>
      )}
    </>
  );
}
