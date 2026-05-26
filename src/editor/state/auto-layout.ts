/**
 * 자동 정렬 — 선택한 Frame 의 자식 배치나 자기 크기 모드를 한 번에 정돈하는 액션.
 *
 * 모두 store.commit 한 번을 거치므로 단일 undo 단위.
 * Figma 의 "정렬" 버튼 묶음 + Hug/Fill 단축 + 추천 리셋을 모은 모음.
 */

"use client";

import type { Node, NodeId, PageDocument, StyleProps } from "@sketchbook/renderer";
import { useEditorStore } from "./store";

/** node + 후손에 안전하게 접근. parent.children 은 Frame 만 비어있지 않음. */
function visit(draft: PageDocument, id: NodeId): Node | undefined {
  return draft.nodes[id];
}

function patchBaseStyle(node: Node, patch: Partial<StyleProps>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete (node.style.base as Record<string, unknown>)[k];
    } else {
      (node.style.base as Record<string, unknown>)[k] = v;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Frame 자식 정렬
// ─────────────────────────────────────────────────────────────

/** 자식들을 주축 양끝으로 균등 분배(justifyContent: space-between). */
export function distributeChildrenEvenly(frameId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const frame = visit(draft, frameId);
    if (!frame || frame.type !== "Frame") return;
    patchBaseStyle(frame, {
      display: "flex",
      justifyContent: "space-between",
    });
  });
}

/** 자식들을 교차축으로 늘림(alignItems: stretch). row 면 세로로, column 이면 가로로 채움. */
export function stretchChildren(frameId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const frame = visit(draft, frameId);
    if (!frame || frame.type !== "Frame") return;
    patchBaseStyle(frame, {
      display: "flex",
      alignItems: "stretch",
    });
  });
}

/** 자식들이 주축 공간을 함께 채움(각 자식에 flexGrow: 1 부여). */
export function fillChildrenMainAxis(frameId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const frame = visit(draft, frameId);
    if (!frame || frame.type !== "Frame") return;
    for (const cid of frame.children) {
      const child = visit(draft, cid);
      if (!child) continue;
      patchBaseStyle(child, { flexGrow: 1 });
      // 주축이 가로면 width: auto, 세로면 height: auto 로 두는 게 자연스러움
      const isRow = (frame.style.base.flexDirection ?? "column") === "row";
      if (isRow) patchBaseStyle(child, { width: "auto" });
      else patchBaseStyle(child, { height: "auto" });
    }
  });
}

/** Frame 자체를 양축 모두 가운데 정렬. */
export function centerAll(frameId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const frame = visit(draft, frameId);
    if (!frame || frame.type !== "Frame") return;
    patchBaseStyle(frame, {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    });
  });
}

/**
 * Frame 추천 리셋 — 합리적 기본값으로 정돈.
 * 자식 수 / 자식 종류 / 현재 방향을 살짝 살펴 결정.
 */
export function smartResetFrame(frameId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const frame = visit(draft, frameId);
    if (!frame || frame.type !== "Frame") return;
    const childCount = frame.children.length;
    // 자식 2~4개 + 모두 같은 Type 이면 row 후보(카드 그룹).
    const childTypes = frame.children.map((c) => draft.nodes[c]?.type).filter(Boolean);
    const allSameType = childTypes.every((t) => t === childTypes[0]);
    const preferRow = childCount >= 2 && childCount <= 4 && allSameType;

    patchBaseStyle(frame, {
      display: "flex",
      flexDirection: preferRow ? "row" : "column",
      gap: 16,
      alignItems: preferRow ? "stretch" : "stretch",
      justifyContent: "flex-start",
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 어떤 노드든 — Hug / Fill 단축
// ─────────────────────────────────────────────────────────────

/** 내용에 맞춤 — width/height 를 auto 로. */
export function hugNode(nodeId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const node = visit(draft, nodeId);
    if (!node) return;
    patchBaseStyle(node, { width: "auto", height: "auto", flexGrow: undefined });
  });
}

/**
 * 부모 채우기 — 부모 flex 방향을 고려해 채움.
 * 부모가 flex 면 주축은 flexGrow, 교차축은 alignSelf:stretch / width|height:100%.
 */
export function fillParent(nodeId: NodeId) {
  useEditorStore.getState().commit((draft) => {
    const node = visit(draft, nodeId);
    if (!node || !node.parentId) return;
    const parent = visit(draft, node.parentId);
    if (!parent) return;
    const isFlex = parent.style.base.display === "flex";
    if (!isFlex) {
      patchBaseStyle(node, { width: "100%", height: "100%" });
      return;
    }
    const isRow = (parent.style.base.flexDirection ?? "column") === "row";
    if (isRow) {
      // 가로 주축 채움 + 세로는 stretch
      patchBaseStyle(node, {
        flexGrow: 1,
        width: "auto",
        alignSelf: "stretch",
        height: "auto",
      });
    } else {
      // 세로 주축 채움 + 가로는 stretch
      patchBaseStyle(node, {
        flexGrow: 1,
        height: "auto",
        alignSelf: "stretch",
        width: "auto",
      });
    }
  });
}
