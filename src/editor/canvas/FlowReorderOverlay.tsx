/**
 * FlowReorderOverlay — 캔버스에서 flow 모드 노드를 드래그해 형제 사이로 재배치한다.
 *
 * 흐름:
 *  1) 이미 선택된 flow 노드 위에서 pointerdown → 잠재적 드래그 시작
 *  2) 5px 이상 움직이면 드래그 모드 진입, 형제 rect 측정 + 드롭 위치 계산
 *  3) 드롭 위치에 인디케이터(가는 인디고 막대) 표시
 *  4) pointerup 시 reorderChild 로 단일 commit (undo 가능)
 *
 * 조건:
 *  - 선택된 노드가 root 가 아니고 layoutMode 가 absolute 가 아닐 때만 활성
 *  - 부모가 Frame 이어야 함
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { Node, NodeId } from "@sketchbook/renderer";
import { useEditorStore } from "../state/store";
import { cssEscape } from "./canvas-doc";

const THRESHOLD = 5; // px

interface DropIndicator {
  /** "h" = 가로 선(column flow), "v" = 세로 선(row flow). */
  type: "h" | "v";
  /** 주축 좌표(h 면 y, v 면 x). */
  pos: number;
  /** 교차축 시작 좌표. */
  cross: number;
  /** 인디케이터 길이. */
  length: number;
}

export function FlowReorderOverlay({ canvasDoc }: { canvasDoc: Document | null }) {
  const doc = useEditorStore((s) => s.doc);
  const selectedId = useEditorStore((s) => s.selectedIds[0]);
  const activeBp = useEditorStore((s) => s.activeBreakpoint);
  const reorderChild = useEditorStore((s) => s.reorderChild);

  const [indicator, setIndicator] = useState<DropIndicator | null>(null);
  // 드래그 중 계산된 최신 드롭 인덱스를 ref 로 보관 — pointerup 핸들러가 읽음.
  const dropRef = useRef<{ parentId: NodeId; newIdx: number } | null>(null);

  useEffect(() => {
    if (!canvasDoc || !selectedId) return;
    const selected = doc.nodes[selectedId];
    if (!selected || selected.id === doc.rootId) return;
    if (selected.layoutMode === "absolute") return; // 자유 배치는 SelectionOverlay 가 처리
    if (!selected.parentId) return;
    const parent = doc.nodes[selected.parentId];
    if (!parent || parent.type !== "Frame") return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest("[data-sk-overlay]")) return;
      if (t.closest("[data-sk-editing]")) return;
      // 선택 노드의 트리 안(자기 자신·후손 어디든) 클릭이면 드래그 후보.
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
      // 마우스 좌클릭만(우클릭/중간 클릭은 무시).
      if (e.button !== 0) return;
      // 텍스트 선택·드래그 기본 동작 차단(클릭 자체는 여전히 발사됨).
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

    const computeDrop = (clientX: number, clientY: number) => {
      const isColumn = (parent.style.base.flexDirection ?? "column") === "column";
      // 자기 자신 제외 형제 rect 수집.
      const otherSiblings = parent.children
        .filter((c) => c !== selectedId)
        .map((id) => {
          const el = canvasDoc.querySelector<HTMLElement>(
            `[data-node-id="${cssEscape(id)}"]`,
          );
          return el ? { id, rect: el.getBoundingClientRect() } : null;
        })
        .filter((x): x is { id: NodeId; rect: DOMRect } => x !== null);

      // 포인터가 각 형제 중점보다 앞이면 그 앞에 삽입.
      let insertBefore = otherSiblings.length;
      for (let i = 0; i < otherSiblings.length; i++) {
        const r = otherSiblings[i].rect;
        const mid = isColumn ? r.top + r.height / 2 : r.left + r.width / 2;
        const pAxis = isColumn ? clientY : clientX;
        if (pAxis < mid) {
          insertBefore = i;
          break;
        }
      }

      // 인디케이터 위치 계산.
      let pos: number, cross: number, length: number;
      const parentEl = canvasDoc.querySelector<HTMLElement>(
        `[data-node-id="${cssEscape(parent.id)}"]`,
      );
      const parentRect = parentEl?.getBoundingClientRect();

      if (otherSiblings.length === 0 && parentRect) {
        // 형제가 없음 — 부모 박스 안 중앙쯤.
        pos = isColumn
          ? parentRect.top + parentRect.height / 2
          : parentRect.left + parentRect.width / 2;
        cross = isColumn ? parentRect.left + 8 : parentRect.top + 8;
        length = (isColumn ? parentRect.width : parentRect.height) - 16;
      } else if (insertBefore === 0) {
        const first = otherSiblings[0].rect;
        pos = isColumn ? first.top - 2 : first.left - 2;
        cross = isColumn ? first.left : first.top;
        length = isColumn ? first.width : first.height;
      } else if (insertBefore >= otherSiblings.length) {
        const last = otherSiblings[otherSiblings.length - 1].rect;
        pos = isColumn ? last.bottom + 2 : last.right + 2;
        cross = isColumn ? last.left : last.top;
        length = isColumn ? last.width : last.height;
      } else {
        const prev = otherSiblings[insertBefore - 1].rect;
        const next = otherSiblings[insertBefore].rect;
        pos = isColumn
          ? (prev.bottom + next.top) / 2
          : (prev.right + next.left) / 2;
        cross = isColumn
          ? Math.min(prev.left, next.left)
          : Math.min(prev.top, next.top);
        length = isColumn
          ? Math.max(prev.right, next.right) - cross
          : Math.max(prev.bottom, next.bottom) - cross;
      }

      setIndicator({ type: isColumn ? "h" : "v", pos, cross, length });
      // 위 insertBefore 는 "자기 자신 제외" 배열 기준 = 자기 제거 후 splice 인덱스와 동일.
      dropRef.current = { parentId: parent.id, newIdx: insertBefore };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId === null) return;
      if (!dragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        dragging = true;
      }
      // 드래그 중에는 텍스트 선택 방지.
      e.preventDefault();
      computeDrop(e.clientX, e.clientY);
    };

    // 드래그 시작 후 텍스트 선택 시도 차단.
    const onSelectStart = (e: Event) => {
      if (dragging) e.preventDefault();
    };
    canvasDoc.addEventListener("selectstart", onSelectStart);

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      try {
        canvasDoc.documentElement.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      if (dragging && dropRef.current) {
        const { parentId, newIdx } = dropRef.current;
        const oldIdx = parent.children.indexOf(selectedId);
        if (oldIdx >= 0 && oldIdx !== newIdx) {
          reorderChild(parentId, oldIdx, newIdx);
        }
        // 만일 텍스트 선택이 살짝이라도 됐다면 정리.
        canvasDoc.defaultView?.getSelection()?.removeAllRanges();
      }
      activePointerId = null;
      dragging = false;
      dropRef.current = null;
      setIndicator(null);
    };

    canvasDoc.addEventListener("pointerdown", onPointerDown);
    canvasDoc.addEventListener("pointermove", onPointerMove);
    canvasDoc.addEventListener("pointerup", onPointerUp);
    canvasDoc.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvasDoc.removeEventListener("pointerdown", onPointerDown);
      canvasDoc.removeEventListener("pointermove", onPointerMove);
      canvasDoc.removeEventListener("pointerup", onPointerUp);
      canvasDoc.removeEventListener("pointercancel", onPointerUp);
      canvasDoc.removeEventListener("selectstart", onSelectStart);
    };
  }, [canvasDoc, selectedId, doc, activeBp, reorderChild]);

  if (!indicator) return null;
  const barStyle: React.CSSProperties =
    indicator.type === "h"
      ? {
          position: "absolute",
          left: indicator.cross,
          top: indicator.pos - 1.5,
          width: indicator.length,
          height: 3,
        }
      : {
          position: "absolute",
          top: indicator.cross,
          left: indicator.pos - 1.5,
          height: indicator.length,
          width: 3,
        };

  return (
    <div
      data-sk-overlay=""
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999998,
      }}
    >
      <div style={{ ...barStyle, background: "#4f46e5", borderRadius: 2 }} />
    </div>
  );
}

/** Frame children 타입 좁히기용 — 사용 안 함, 의도 표시. */
export type _FlowChild = Pick<Node, "id">;
