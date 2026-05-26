/**
 * Command — 문서에 대한 모든 변경의 단위.
 *
 * 각 함수는 Immer draft 를 받아 직접 변형하는 mutator 를 반환한다.
 * store 가 `produceWithPatches` 로 적용하면서 patch/inverse-patch 를 히스토리에 쌓는다.
 * 에디터 UI 도, AI 채팅 편집도 동일하게 이 Command 들을 거친다 → 일관된 undo/redo.
 */

import type {
  BreakpointId,
  Node,
  NodeId,
  PageDocument,
  StyleProps,
} from "@sketchbook/renderer";
import { getDescendants } from "@sketchbook/renderer";

export type Mutator = (draft: PageDocument) => void;

/** 노드(및 후손)를 parentId 의 자식 index 위치에 삽입한다. */
export function cmdInsertNode(
  parentId: NodeId,
  node: Node,
  descendants: Record<NodeId, Node> = {},
  index?: number,
): Mutator {
  return (doc) => {
    const parent = doc.nodes[parentId];
    if (!parent || parent.type !== "Frame") return;
    node.parentId = parentId;
    doc.nodes[node.id] = node;
    for (const [id, d] of Object.entries(descendants)) {
      doc.nodes[id] = d;
    }
    const at = index ?? parent.children.length;
    parent.children.splice(at, 0, node.id);
  };
}

/** 노드와 그 후손을 모두 삭제한다. 루트는 삭제 불가. */
export function cmdDeleteNode(nodeId: NodeId): Mutator {
  return (doc) => {
    if (nodeId === doc.rootId) return;
    const node = doc.nodes[nodeId];
    if (!node) return;
    const toRemove = [nodeId, ...getDescendants(doc.nodes, nodeId)];
    // 부모의 children 에서 제거.
    if (node.parentId) {
      const parent = doc.nodes[node.parentId];
      if (parent) {
        parent.children = parent.children.filter((c) => c !== nodeId);
      }
    }
    for (const id of toRemove) delete doc.nodes[id];
  };
}

/** 노드를 새 부모의 index 위치로 이동한다(트리 재배치). */
export function cmdMoveNode(
  nodeId: NodeId,
  newParentId: NodeId,
  index: number,
): Mutator {
  return (doc) => {
    if (nodeId === doc.rootId) return;
    const node = doc.nodes[nodeId];
    const newParent = doc.nodes[newParentId];
    if (!node || !newParent || newParent.type !== "Frame") return;
    // 순환 방지: 자기 자신/후손 안으로 이동 금지.
    if (newParentId === nodeId) return;
    if (getDescendants(doc.nodes, nodeId).includes(newParentId)) return;

    // 기존 부모에서 제거.
    if (node.parentId) {
      const oldParent = doc.nodes[node.parentId];
      if (oldParent) {
        oldParent.children = oldParent.children.filter((c) => c !== nodeId);
      }
    }
    node.parentId = newParentId;
    const clamped = Math.max(0, Math.min(index, newParent.children.length));
    newParent.children.splice(clamped, 0, nodeId);
  };
}

/** 같은 부모 안에서 자식 순서를 바꾼다. */
export function cmdReorderChild(
  parentId: NodeId,
  fromIndex: number,
  toIndex: number,
): Mutator {
  return (doc) => {
    const parent = doc.nodes[parentId];
    if (!parent) return;
    const ids = parent.children;
    if (fromIndex < 0 || fromIndex >= ids.length) return;
    const [moved] = ids.splice(fromIndex, 1);
    const clamped = Math.max(0, Math.min(toIndex, ids.length));
    ids.splice(clamped, 0, moved);
  };
}

/** 한 breakpoint 의 스타일을 부분 갱신한다. undefined 값은 속성 제거를 뜻한다. */
export function cmdUpdateStyle(
  nodeId: NodeId,
  breakpoint: BreakpointId,
  patch: Partial<StyleProps>,
): Mutator {
  return (doc) => {
    const node = doc.nodes[nodeId];
    if (!node) return;
    const current =
      breakpoint === "base"
        ? node.style.base
        : (node.style[breakpoint] ?? {});
    const next: StyleProps = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) {
        delete (next as Record<string, unknown>)[k];
      } else {
        (next as Record<string, unknown>)[k] = v;
      }
    }
    if (breakpoint === "base") {
      node.style.base = next;
    } else {
      node.style[breakpoint] = next;
    }
  };
}

/** 노드 props 를 부분 갱신한다. */
export function cmdUpdateProps(
  nodeId: NodeId,
  patch: Record<string, unknown>,
): Mutator {
  return (doc) => {
    const node = doc.nodes[nodeId];
    if (!node) return;
    Object.assign(node.props, patch);
  };
}

/** 레이어 표시명 변경. */
export function cmdRename(nodeId: NodeId, name: string): Mutator {
  return (doc) => {
    const node = doc.nodes[nodeId];
    if (node) node.name = name;
  };
}

/** flow ↔ absolute 레이아웃 모드 토글. */
export function cmdSetLayoutMode(
  nodeId: NodeId,
  mode: "flow" | "absolute",
): Mutator {
  return (doc) => {
    const node = doc.nodes[nodeId];
    if (!node || nodeId === doc.rootId) return;
    node.layoutMode = mode;
  };
}

/** breakpoint 별 표시/숨김 토글. */
export function cmdSetHidden(
  nodeId: NodeId,
  breakpoint: BreakpointId,
  hidden: boolean,
): Mutator {
  return (doc) => {
    const node = doc.nodes[nodeId];
    if (!node) return;
    node.hidden = { ...node.hidden, [breakpoint]: hidden };
  };
}
