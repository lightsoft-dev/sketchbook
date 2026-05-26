/**
 * FlowReorderOverlay — 캔버스에서 flow 모드 노드를 드래그해 형제 사이로 재배치한다.
 *
 * Figma 식 인터랙션:
 *  - 드래그 요소가 마우스를 따라옴 (transform + opacity + shadow)
 *  - 형제들이 실시간으로 transform 으로 자리를 비워줌 (180ms transition 으로 보간)
 *  - drop 시 FLIP 으로 드래그 요소도 새 위치에 부드럽게 안착
 *
 * 흐름:
 *  1) 선택된 flow 노드 트리 안에서 pointerdown → 잠재적 드래그
 *  2) 5px 임계 통과 → 드래그 모드 진입. 형제 정보(rect, gap, size) 캐시
 *  3) pointermove: 드래그 요소 transform=translate(dx,dy), 형제들 transform=translateY/X(shift)
 *  4) pointerup: 형제 transform 정리, reorderChild, 드래그 요소 FLIP 애니메이션
 *
 * 조건: 선택된 노드 != root, layoutMode != absolute, 부모가 Frame.
 */

"use client";

import { useEffect, useRef } from "react";
import type { NodeId } from "@sketchbook/renderer";
import { useEditorStore } from "../state/store";
import { cssEscape } from "./canvas-doc";

const THRESHOLD = 5; // px
const TRANSITION = "transform 180ms cubic-bezier(0.2, 0, 0.2, 1)";

export function FlowReorderOverlay({ canvasDoc }: { canvasDoc: Document | null }) {
  const doc = useEditorStore((s) => s.doc);
  const selectedId = useEditorStore((s) => s.selectedIds[0]);
  const activeBp = useEditorStore((s) => s.activeBreakpoint);
  const reorderChild = useEditorStore((s) => s.reorderChild);

  // useRef 로 보관하여 useEffect 가 자주 재구성되어도 같은 핸들러가 쓰는 상태 유지.
  const dropRef = useRef<{ parentId: NodeId; newIdx: number } | null>(null);

  useEffect(() => {
    if (!canvasDoc || !selectedId) return;
    const selected = doc.nodes[selectedId];
    if (!selected || selected.id === doc.rootId) return;
    if (selected.layoutMode === "absolute") return;
    if (!selected.parentId) return;
    const parent = doc.nodes[selected.parentId];
    if (!parent || parent.type !== "Frame") return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;

    // 드래그 시작 시 캐시되는 정보 — 시프트로 위치가 바뀐 후에도 안정적으로 사용.
    let draggedEl: HTMLElement | null = null;
    let otherSibs: Array<{
      id: NodeId;
      el: HTMLElement;
      originalIdx: number;
      /** 드래그 시작 시점의 rect — 드롭 인덱스 계산에 사용(시프트 무관). */
      origRect: DOMRect;
    }> = [];
    let isColumn = true;
    let shiftAmount = 0;

    const clearTransforms = () => {
      if (draggedEl) {
        draggedEl.style.transform = "";
        draggedEl.style.opacity = "";
        draggedEl.style.transition = "";
        draggedEl.style.boxShadow = "";
        draggedEl.style.zIndex = "";
        draggedEl.style.pointerEvents = "";
        draggedEl.style.cursor = "";
      }
      for (const sib of otherSibs) {
        sib.el.style.transform = "";
        sib.el.style.transition = "";
      }
    };

    const initDragCache = () => {
      draggedEl = canvasDoc.querySelector<HTMLElement>(
        `[data-node-id="${cssEscape(selectedId)}"]`,
      );
      if (!draggedEl) return false;

      isColumn = (parent.style.base.flexDirection ?? "column") === "column";
      const draggedRect = draggedEl.getBoundingClientRect();
      const gap =
        typeof parent.style.base.gap === "number" ? parent.style.base.gap : 0;
      shiftAmount = (isColumn ? draggedRect.height : draggedRect.width) + gap;

      otherSibs = parent.children
        .filter((c) => c !== selectedId)
        .map((id) => {
          const el = canvasDoc.querySelector<HTMLElement>(
            `[data-node-id="${cssEscape(id)}"]`,
          );
          if (!el) return null;
          return {
            id,
            el,
            originalIdx: parent.children.indexOf(id),
            origRect: el.getBoundingClientRect(),
          };
        })
        .filter(
          (x): x is { id: NodeId; el: HTMLElement; originalIdx: number; origRect: DOMRect } =>
            x !== null,
        );

      return true;
    };

    const applyDragStyles = (dx: number, dy: number) => {
      if (!draggedEl) return;
      draggedEl.style.transform = `translate(${dx}px, ${dy}px)`;
      draggedEl.style.opacity = "0.85";
      draggedEl.style.transition = "none";
      draggedEl.style.pointerEvents = "none";
      draggedEl.style.zIndex = "1000";
      draggedEl.style.boxShadow =
        "0 10px 30px rgba(79,70,229,0.25), 0 2px 8px rgba(0,0,0,0.15)";
      draggedEl.style.cursor = "grabbing";
    };

    const applySiblingShifts = (newIdx: number) => {
      otherSibs.forEach((sib, filteredIdx) => {
        // 드래그 요소가 새 위치에 들어간 후 sib 의 전체 배열 인덱스.
        const finalIdx = filteredIdx < newIdx ? filteredIdx : filteredIdx + 1;
        const shift = (finalIdx - sib.originalIdx) * shiftAmount;
        sib.el.style.transform = isColumn
          ? `translateY(${shift}px)`
          : `translateX(${shift}px)`;
        sib.el.style.transition = TRANSITION;
      });
    };

    /** 캐시된 "원래 rect" 기준으로 드롭 인덱스 계산 — 시프트와 무관해 안정적. */
    const computeDrop = (clientX: number, clientY: number) => {
      let insertBefore = otherSibs.length;
      for (let i = 0; i < otherSibs.length; i++) {
        const r = otherSibs[i].origRect;
        const mid = isColumn ? r.top + r.height / 2 : r.left + r.width / 2;
        const p = isColumn ? clientY : clientX;
        if (p < mid) {
          insertBefore = i;
          break;
        }
      }
      dropRef.current = { parentId: parent.id, newIdx: insertBefore };
      return insertBefore;
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest("[data-sk-overlay]")) return;
      if (t.closest("[data-sk-editing]")) return;

      let cur: HTMLElement | null = t.closest("[data-node-id]") as HTMLElement | null;
      let onSelectedTree = false;
      while (cur) {
        if (cur.getAttribute("data-node-id") === selectedId) {
          onSelectedTree = true;
          break;
        }
        cur = (cur.parentElement?.closest("[data-node-id]") ?? null) as HTMLElement | null;
      }
      if (!onSelectedTree) return;
      if (e.button !== 0) return;
      e.preventDefault();

      startX = e.clientX;
      startY = e.clientY;
      activePointerId = e.pointerId;
      dragging = false;
      try {
        canvasDoc.documentElement.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        dragging = true;
        // 드래그 진입 시 1회 캐시 + 초기 스타일.
        if (!initDragCache()) {
          dragging = false;
          activePointerId = null;
          return;
        }
      }
      e.preventDefault();
      // 드래그 요소: 마우스 따라옴.
      applyDragStyles(dx, dy);
      // 드롭 위치 계산 + 형제들 보간.
      const newIdx = computeDrop(e.clientX, e.clientY);
      applySiblingShifts(newIdx);
    };

    const onSelectStart = (e: Event) => {
      if (dragging) e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      try {
        canvasDoc.documentElement.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }

      if (dragging && dropRef.current && draggedEl) {
        const { parentId, newIdx } = dropRef.current;
        const oldIdx = parent.children.indexOf(selectedId);

        // FLIP: 1) 현재 시각 위치 캡처 (드래그 요소).
        const draggedBefore = draggedEl.getBoundingClientRect();

        // 2) 모든 transform 정리 → reorderChild → DOM 이 새 순서로 reflow.
        clearTransforms();

        if (oldIdx >= 0 && oldIdx !== newIdx) {
          reorderChild(parentId, oldIdx, newIdx);
        }

        // 3) 새 위치 측정 → 차이만큼 다시 transform 으로 되돌려놓고 → transition 으로 0 까지 보간.
        const capturedEl = draggedEl;
        requestAnimationFrame(() => {
          const after = capturedEl.getBoundingClientRect();
          const flipX = draggedBefore.left - after.left;
          const flipY = draggedBefore.top - after.top;
          if (Math.abs(flipX) < 0.5 && Math.abs(flipY) < 0.5) return;

          capturedEl.style.transition = "none";
          capturedEl.style.transform = `translate(${flipX}px, ${flipY}px)`;
          // 강제 reflow 해서 위 transform 이 시작 상태로 고정되게.
          void capturedEl.offsetHeight;
          capturedEl.style.transition =
            "transform 220ms cubic-bezier(0.2, 0, 0.2, 1)";
          capturedEl.style.transform = "";
          window.setTimeout(() => {
            capturedEl.style.transition = "";
          }, 260);
        });

        canvasDoc.defaultView?.getSelection()?.removeAllRanges();
      } else {
        // 드래그 아니었음 — 그냥 정리.
        clearTransforms();
      }

      activePointerId = null;
      dragging = false;
      dropRef.current = null;
      draggedEl = null;
      otherSibs = [];
    };

    canvasDoc.addEventListener("pointerdown", onPointerDown);
    canvasDoc.addEventListener("pointermove", onPointerMove);
    canvasDoc.addEventListener("pointerup", onPointerUp);
    canvasDoc.addEventListener("pointercancel", onPointerUp);
    canvasDoc.addEventListener("selectstart", onSelectStart);
    return () => {
      // 드래그 중 effect 가 재구성되는 경우 안전하게 정리.
      clearTransforms();
      canvasDoc.removeEventListener("pointerdown", onPointerDown);
      canvasDoc.removeEventListener("pointermove", onPointerMove);
      canvasDoc.removeEventListener("pointerup", onPointerUp);
      canvasDoc.removeEventListener("pointercancel", onPointerUp);
      canvasDoc.removeEventListener("selectstart", onSelectStart);
    };
  }, [canvasDoc, selectedId, doc, activeBp, reorderChild]);

  // 별도 인디케이터 DOM 은 더 이상 필요 없음 — 형제 시프트로 드롭 위치가 시각화됨.
  return null;
}
