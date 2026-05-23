/**
 * EditorShell — 비주얼 에디터 3분할 셸.
 * 좌: 팔레트 + 레이어 / 중앙: 캔버스 / 우: 인스펙터. 상단: 툴바.
 */

"use client";

import { useEffect } from "react";
import { CanvasStage } from "./canvas/CanvasStage";
import { ComponentPalette } from "./panels/ComponentPalette";
import { Inspector } from "./panels/Inspector";
import { LayersPanel } from "./panels/LayersPanel";
import { useEditorStore } from "./state/store";
import { Toolbar } from "./Toolbar";

export function EditorShell() {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-neutral-800">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {/* 좌측 패널 */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
          <ComponentPalette />
          <div className="min-h-0 flex-1">
            <LayersPanel />
          </div>
        </aside>

        {/* 중앙 캔버스 */}
        <main className="min-w-0 flex-1">
          <CanvasStage />
        </main>

        {/* 우측 인스펙터 */}
        <aside className="w-64 shrink-0 border-l border-neutral-200 bg-white">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}

/** 전역 키보드 단축키 — Undo/Redo, 선택 노드 삭제, 복제. */
function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력 요소에 포커스 중이면 단축키를 가로채지 않는다.
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        // 선택 노드 복제 (브라우저 북마크 단축키 가로채기).
        const sel = useEditorStore.getState().selectedIds[0];
        if (sel) {
          e.preventDefault();
          duplicateNode(sel);
        }
        return;
      }
      if (!inField && (e.key === "Delete" || e.key === "Backspace")) {
        const sel = useEditorStore.getState().selectedIds[0];
        if (sel) {
          e.preventDefault();
          deleteNode(sel);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, deleteNode, duplicateNode]);
}
