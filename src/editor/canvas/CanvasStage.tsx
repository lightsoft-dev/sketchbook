/**
 * CanvasStage — 에디터 중앙 캔버스.
 *
 * 현재 문서를 컴파일해 iframe 안에 렌더하고, iframe 문서에 선택/호버
 * 상호작용을 연결한다. 같은 `NodeRenderer` 를 edit 모드로 쓴다.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BREAKPOINTS, type NodeId } from "@/document/types";
import { compileDocument } from "@/renderer/style/compiler";
import { SK_RESET } from "@/renderer/style/reset";
import { NodeRenderer, type RenderContext } from "@/renderer/NodeRenderer";
import { useEditorStore } from "../state/store";
import { CanvasFrame } from "./CanvasFrame";

/** edit 모드 전용 CSS — 선택/호버 아웃라인. */
const EDITOR_CSS = `
[data-node-id]{cursor:default;}
[data-sk-hover]{outline:1.5px solid #93c5fd!important;outline-offset:-1.5px;}
[data-sk-selected]{outline:2px solid #4f46e5!important;outline-offset:-2px;}
[data-sk-selected][data-sk-hover]{outline:2px solid #4f46e5!important;}
`;

export function CanvasStage() {
  const doc = useEditorStore((s) => s.doc);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const select = useEditorStore((s) => s.select);
  const setHovered = useEditorStore((s) => s.setHovered);

  const [canvasDoc, setCanvasDoc] = useState<Document | null>(null);

  const width =
    BREAKPOINTS.find((b) => b.id === activeBreakpoint)?.canvasWidth ?? 1280;

  const compiled = useMemo(() => compileDocument(doc), [doc]);

  const onDocument = useCallback((d: Document) => setCanvasDoc(d), []);

  // iframe 문서에 클릭(선택)/이동(호버) 리스너를 연결한다.
  useStageInteractions(canvasDoc, select, setHovered);

  const ctx: RenderContext = {
    doc,
    classNames: compiled.classNames,
    mode: "edit",
    selectedIds: new Set(selectedIds),
    hoveredId,
  };

  return (
    <div className="flex h-full w-full justify-center overflow-auto bg-neutral-200 p-8">
      <CanvasFrame width={width} onDocument={onDocument}>
        <style
          dangerouslySetInnerHTML={{
            __html: SK_RESET + EDITOR_CSS + compiled.css,
          }}
        />
        <NodeRenderer nodeId={doc.rootId} ctx={ctx} />
      </CanvasFrame>
    </div>
  );
}

/** iframe 문서에 선택/호버 상호작용을 연결한다. */
function useStageInteractions(
  canvasDoc: Document | null,
  select: (id: NodeId | null) => void,
  setHovered: (id: NodeId | null) => void,
) {
  useEffect(() => {
    if (!canvasDoc) return;

    const nodeIdOf = (target: EventTarget | null): NodeId | null => {
      const el = (target as HTMLElement | null)?.closest?.("[data-node-id]");
      return el?.getAttribute("data-node-id") ?? null;
    };

    const onClick = (e: MouseEvent) => {
      // 캔버스 안의 링크/버튼 기본 동작을 막고 선택으로 해석.
      e.preventDefault();
      select(nodeIdOf(e.target));
    };
    const onMove = (e: MouseEvent) => setHovered(nodeIdOf(e.target));
    const onLeave = () => setHovered(null);

    canvasDoc.addEventListener("click", onClick, true);
    canvasDoc.addEventListener("mousemove", onMove);
    canvasDoc.addEventListener("mouseleave", onLeave);
    return () => {
      canvasDoc.removeEventListener("click", onClick, true);
      canvasDoc.removeEventListener("mousemove", onMove);
      canvasDoc.removeEventListener("mouseleave", onLeave);
    };
  }, [canvasDoc, select, setHovered]);
}
