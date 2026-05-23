/**
 * flow ↔ absolute 전환 시 시각 위치를 보존한다.
 *
 * flow → absolute: 현재 캔버스 안 rect 를 측정해 부모 기준 top/left/width/height 를
 * 스타일에 동결(freeze)한다 → 화면상 위치가 점프하지 않는다.
 * absolute → flow: position/top/left 를 제거한다(크기는 유지).
 */

"use client";

import { useEditorStore } from "../state/store";
import { findNodeEl } from "./canvas-doc";

export function applyLayoutModeChange(
  nodeId: string,
  mode: "flow" | "absolute",
) {
  const store = useEditorStore.getState();
  const node = store.doc.nodes[nodeId];
  if (!node || nodeId === store.doc.rootId) return;

  if (mode === "absolute") {
    const el = findNodeEl(nodeId);
    const pEl = node.parentId ? findNodeEl(node.parentId) : null;
    if (el && pEl) {
      const r = el.getBoundingClientRect();
      const pr = pEl.getBoundingClientRect();
      const left = Math.round(r.left - pr.left);
      const top = Math.round(r.top - pr.top);
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      store.commit((draft) => {
        const n = draft.nodes[nodeId];
        if (!n) return;
        n.layoutMode = "absolute";
        n.style.base.position = "absolute";
        n.style.base.left = left;
        n.style.base.top = top;
        n.style.base.width = width;
        n.style.base.height = height;
      });
      return;
    }
  }

  // flow 로 복귀 — 위치 속성 제거.
  store.commit((draft) => {
    const n = draft.nodes[nodeId];
    if (!n) return;
    n.layoutMode = mode;
    if (mode === "flow") {
      delete n.style.base.position;
      delete n.style.base.left;
      delete n.style.base.top;
    }
  });
}
