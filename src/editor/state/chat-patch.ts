/**
 * 채팅 편집 결과로 받은 PatchOp 배열을 단일 Command 로 묶어 적용한다.
 * 한 번의 undo 단위가 되어 사용자가 Cmd+Z 로 통째로 되돌릴 수 있다.
 */

"use client";

import { newNodeId } from "@sketchbook/renderer";
import { flatten } from "@sketchbook/renderer";
import type { BreakpointId, Node, NodeId, PageDocument, StyleProps, TreeNode } from "@sketchbook/renderer";
import type { ChatPatchOp } from "@/server/ai/chat-edit";
import { useEditorStore } from "./store";

export function applyChatOps(ops: ChatPatchOp[]) {
  if (ops.length === 0) return;
  useEditorStore.getState().commit((draft) => {
    for (const op of ops) applyOne(draft, op);
  });
}

function applyOne(draft: PageDocument, op: ChatPatchOp): void {
  switch (op.op) {
    case "setStyle": {
      const node = draft.nodes[op.nodeId];
      if (!node) return;
      const bp = (op.breakpoint ?? "base") as BreakpointId;
      const current =
        bp === "base"
          ? (node.style.base as Record<string, unknown>)
          : ((node.style[bp] ?? {}) as Record<string, unknown>);
      const next: Record<string, unknown> = { ...current };
      for (const [k, v] of Object.entries(op.style)) {
        if (v === undefined || v === null) delete next[k];
        else next[k] = v;
      }
      if (bp === "base") node.style.base = next as StyleProps;
      else node.style[bp] = next as StyleProps;
      return;
    }
    case "setProps": {
      const node = draft.nodes[op.nodeId];
      if (!node) return;
      Object.assign(node.props as Record<string, unknown>, op.props);
      return;
    }
    case "removeNode": {
      const node = draft.nodes[op.nodeId];
      if (!node || op.nodeId === draft.rootId) return;
      if (node.parentId) {
        const parent = draft.nodes[node.parentId];
        if (parent) parent.children = parent.children.filter((c) => c !== op.nodeId) as Node["children"];
      }
      const toDelete: NodeId[] = [op.nodeId, ...collectDescendants(draft, op.nodeId)];
      for (const id of toDelete) delete draft.nodes[id];
      return;
    }
    case "insertNode": {
      const parent = draft.nodes[op.parentId];
      if (!parent || parent.type !== "Frame") return;
      try {
        const flat = flatten(op.node as TreeNode);
        const insertedRoot = flat.nodes[flat.rootId];
        if (!insertedRoot) return;

        // 충돌 방지: 새로 부여한 id 가 draft 와 겹치면 새 id 로 재발급.
        const idRemap: Record<NodeId, NodeId> = {};
        for (const id of Object.keys(flat.nodes)) {
          idRemap[id] = draft.nodes[id] ? newNodeId() : id;
        }
        const remap = (id: NodeId) => idRemap[id] ?? id;

        for (const node of Object.values(flat.nodes)) {
          const newId = remap(node.id);
          node.id = newId;
          if (node.parentId) node.parentId = remap(node.parentId);
          node.children = node.children.map(remap) as Node["children"];
          draft.nodes[newId] = node;
        }
        const rootNewId = remap(flat.rootId);
        const rootNode = draft.nodes[rootNewId];
        if (rootNode) rootNode.parentId = op.parentId;
        const at = op.index ?? parent.children.length;
        parent.children.splice(Math.max(0, Math.min(at, parent.children.length)), 0, rootNewId);
      } catch {
        return;
      }
      return;
    }
  }
}

function collectDescendants(draft: PageDocument, id: NodeId): NodeId[] {
  const result: NodeId[] = [];
  const stack = [...(draft.nodes[id]?.children ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    result.push(cur);
    stack.push(...(draft.nodes[cur]?.children ?? []));
  }
  return result;
}
