/**
 * SelectionOverlay — 선택 박스 + 8방향 리사이즈 핸들 + 자유배치 이동 + 스냅 가이드.
 *
 * iframe 안의 portal 트리 안에 렌더되어 같은 좌표계를 쓴다(position:fixed → iframe 뷰포트).
 * 이 컴포넌트만 선택 노드의 DOM rect 를 측정해 핸들을 그린다 — 다른 노드 렌더링은 영향 없음.
 */

"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NodeId } from "@sketchbook/renderer";
import { useEditorStore } from "../state/store";
import { cssEscape } from "./canvas-doc";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface HandleDef {
  dir: HandleDir;
  /** 0..1 — 노드 박스 안의 상대 위치. */
  x: number;
  y: number;
  cursor: string;
}

const HANDLES: HandleDef[] = [
  { dir: "nw", x: 0,   y: 0,   cursor: "nwse-resize" },
  { dir: "n",  x: 0.5, y: 0,   cursor: "ns-resize"   },
  { dir: "ne", x: 1,   y: 0,   cursor: "nesw-resize" },
  { dir: "e",  x: 1,   y: 0.5, cursor: "ew-resize"   },
  { dir: "se", x: 1,   y: 1,   cursor: "nwse-resize" },
  { dir: "s",  x: 0.5, y: 1,   cursor: "ns-resize"   },
  { dir: "sw", x: 0,   y: 1,   cursor: "nesw-resize" },
  { dir: "w",  x: 0,   y: 0.5, cursor: "ew-resize"   },
];

const SNAP_TOL = 6; // px

interface Guide {
  type: "v" | "h";
  /** iframe 뷰포트 좌표. */
  at: number;
}

export function SelectionOverlay({ canvasDoc }: { canvasDoc: Document | null }) {
  const selectedId = useEditorStore((s) => s.selectedIds[0]) as NodeId | undefined;
  const doc = useEditorStore((s) => s.doc);
  const activeBp = useEditorStore((s) => s.activeBreakpoint);
  const editingTextId = useEditorStore((s) => s.editingTextId);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  const [rect, setRect] = useState<Rect | null>(null);
  const [parentRect, setParentRect] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  const node = selectedId ? doc.nodes[selectedId] : null;
  const isAbsolute = node?.layoutMode === "absolute";
  const isRoot = selectedId === doc.rootId;

  // 선택/문서/breakpoint/스크롤/리사이즈 변경 시 rect 재측정.
  useEffect(() => {
    if (!canvasDoc || !selectedId) {
      setRect(null);
      setParentRect(null);
      return;
    }

    const measure = () => {
      const el = canvasDoc.querySelector<HTMLElement>(
        `[data-node-id="${cssEscape(selectedId)}"]`,
      );
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      const parentId = doc.nodes[selectedId]?.parentId;
      if (parentId) {
        const pEl = canvasDoc.querySelector<HTMLElement>(
          `[data-node-id="${cssEscape(parentId)}"]`,
        );
        if (pEl) {
          const pr = pEl.getBoundingClientRect();
          setParentRect({ left: pr.left, top: pr.top, width: pr.width, height: pr.height });
        } else {
          setParentRect(null);
        }
      } else {
        setParentRect(null);
      }
    };

    measure();
    // 레이아웃이 안정된 후 한 번 더 측정(폰트 로딩 등).
    const raf = requestAnimationFrame(measure);

    const win = canvasDoc.defaultView;
    canvasDoc.addEventListener("scroll", measure, true);
    win?.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      canvasDoc.removeEventListener("scroll", measure, true);
      win?.removeEventListener("resize", measure);
    };
  }, [canvasDoc, selectedId, doc, activeBp]);

  // 인라인 텍스트 편집 중에는 핸들/외곽선을 숨겨 텍스트 조작에 집중하게 한다.
  if (editingTextId) return null;
  if (!rect || !selectedId || !node || isRoot) return null;

  // ── 리사이즈 핸들 드래그 ──
  const startResize = (dir: HandleDir, e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const sLeft = rect.left, sTop = rect.top, sW = rect.width, sH = rect.height;
    const sPar = parentRect;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let w = sW, h = sH, t = sTop, l = sLeft;
      if (dir.includes("e")) w = Math.max(8, sW + dx);
      if (dir.includes("w")) { w = Math.max(8, sW - dx); l = sLeft + (sW - w); }
      if (dir.includes("s")) h = Math.max(8, sH + dy);
      if (dir.includes("n")) { h = Math.max(8, sH - dy); t = sTop + (sH - h); }

      const patch: Record<string, unknown> = {};
      if (dir.includes("e") || dir.includes("w")) patch.width = Math.round(w);
      if (dir.includes("s") || dir.includes("n")) patch.height = Math.round(h);
      if (isAbsolute && sPar) {
        if (dir.includes("w")) patch.left = Math.round(l - sPar.left);
        if (dir.includes("n")) patch.top = Math.round(t - sPar.top);
      }
      updateStyle(selectedId, patch, { coalesceKey: `resize:${selectedId}` });
    };

    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  // ── 자유배치 이동 드래그 ──
  const startMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isAbsolute || !parentRect) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX, startY = e.clientY;
    const sLeftRel = rect.left - parentRect.left;
    const sTopRel = rect.top - parentRect.top;
    const w = rect.width, h = rect.height;
    const sPar = parentRect;

    // 형제 rect 수집(스냅 대상).
    const siblings: Rect[] = [];
    const parentNode = doc.nodes[node.parentId!];
    if (parentNode && canvasDoc) {
      for (const sid of parentNode.children) {
        if (sid === selectedId) continue;
        const sEl = canvasDoc.querySelector<HTMLElement>(
          `[data-node-id="${cssEscape(sid)}"]`,
        );
        if (sEl) {
          const sr = sEl.getBoundingClientRect();
          siblings.push({ left: sr.left, top: sr.top, width: sr.width, height: sr.height });
        }
      }
    }

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const snapped = snapPosition(sLeftRel + dx, sTopRel + dy, w, h, sPar, siblings);
      setGuides(snapped.guides);
      updateStyle(
        selectedId,
        { left: Math.round(snapped.left), top: Math.round(snapped.top) },
        { coalesceKey: `move:${selectedId}` },
      );
    };

    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      setGuides([]);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  // flow 노드: 오른쪽/아래/우하단 핸들만(레이아웃에 영향 적음).
  // absolute 노드: 8방향 + 본체 드래그(이동).
  const visibleHandles = isAbsolute
    ? HANDLES
    : HANDLES.filter((h) => h.dir === "e" || h.dir === "s" || h.dir === "se");

  return (
    <div
      data-sk-overlay=""
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 999999,
      }}
    >
      {/* 외곽선 (absolute 일 때 본체 드래그 영역 = 노드 자체) */}
      <div
        onPointerDown={isAbsolute ? startMove : undefined}
        style={{
          position: "absolute",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          outline: "2px solid #4f46e5",
          outlineOffset: "-1px",
          boxSizing: "border-box",
          pointerEvents: isAbsolute ? "auto" : "none",
          cursor: isAbsolute ? "move" : "default",
          background: isAbsolute ? "rgba(79,70,229,0.04)" : "transparent",
        }}
      />
      {/* 핸들 */}
      {visibleHandles.map((h) => (
        <div
          key={h.dir}
          onPointerDown={(e) => startResize(h.dir, e)}
          style={{
            position: "absolute",
            left: rect.left + rect.width * h.x - 5,
            top: rect.top + rect.height * h.y - 5,
            width: 10,
            height: 10,
            background: "#ffffff",
            border: "1.5px solid #4f46e5",
            borderRadius: 2,
            cursor: h.cursor,
            pointerEvents: "auto",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
      ))}
      {/* 스냅 가이드 */}
      {guides.map((g, i) =>
        g.type === "v" ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.at,
              top: 0,
              bottom: 0,
              width: 1,
              background: "#ec4899",
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: "absolute",
              top: g.at,
              left: 0,
              right: 0,
              height: 1,
              background: "#ec4899",
            }}
          />
        ),
      )}
    </div>
  );
}

/**
 * 부모 가장자리/중앙, 형제 가장자리/중앙에 스냅한다.
 * `left/top` 은 부모 로컬 좌표(이동 후 노드의 좌상단), `parent.left/top` 은 iframe 뷰포트 좌표.
 */
function snapPosition(
  left: number,
  top: number,
  w: number,
  h: number,
  parent: Rect,
  siblings: Rect[],
): { left: number; top: number; guides: Guide[] } {
  // 후보: {나의 어느 점(my:0|w|w/2), 타겟(부모 로컬 좌표), 가이드 절대 좌표}
  interface Cand { my: number; tgt: number; guideAbs: number; }
  const xC: Cand[] = [
    { my: 0,   tgt: 0,             guideAbs: parent.left },
    { my: w,   tgt: parent.width,  guideAbs: parent.left + parent.width },
    { my: w/2, tgt: parent.width/2, guideAbs: parent.left + parent.width/2 },
  ];
  const yC: Cand[] = [
    { my: 0,   tgt: 0,              guideAbs: parent.top },
    { my: h,   tgt: parent.height,  guideAbs: parent.top + parent.height },
    { my: h/2, tgt: parent.height/2, guideAbs: parent.top + parent.height/2 },
  ];
  for (const s of siblings) {
    const sl = s.left - parent.left;
    const sr = sl + s.width;
    const scx = sl + s.width / 2;
    const st = s.top - parent.top;
    const sb = st + s.height;
    const scy = st + s.height / 2;
    xC.push({ my: 0,   tgt: sl,  guideAbs: s.left });
    xC.push({ my: w,   tgt: sr,  guideAbs: s.left + s.width });
    xC.push({ my: w/2, tgt: scx, guideAbs: s.left + s.width / 2 });
    yC.push({ my: 0,   tgt: st,  guideAbs: s.top });
    yC.push({ my: h,   tgt: sb,  guideAbs: s.top + s.height });
    yC.push({ my: h/2, tgt: scy, guideAbs: s.top + s.height / 2 });
  }

  let bestX = { d: Infinity, l: left, guide: 0 };
  for (const c of xC) {
    const d = Math.abs(left + c.my - c.tgt);
    if (d < bestX.d) bestX = { d, l: c.tgt - c.my, guide: c.guideAbs };
  }
  let bestY = { d: Infinity, t: top, guide: 0 };
  for (const c of yC) {
    const d = Math.abs(top + c.my - c.tgt);
    if (d < bestY.d) bestY = { d, t: c.tgt - c.my, guide: c.guideAbs };
  }

  const guides: Guide[] = [];
  const outL = bestX.d <= SNAP_TOL ? bestX.l : left;
  const outT = bestY.d <= SNAP_TOL ? bestY.t : top;
  if (bestX.d <= SNAP_TOL) guides.push({ type: "v", at: bestX.guide });
  if (bestY.d <= SNAP_TOL) guides.push({ type: "h", at: bestY.guide });
  return { left: outL, top: outT, guides };
}
