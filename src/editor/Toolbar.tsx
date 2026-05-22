/**
 * Toolbar — 상단바. Undo/Redo, breakpoint 전환, 페이지 제목, 미리보기.
 */

"use client";

import { BREAKPOINTS } from "@/document/types";
import { useEditorStore } from "./state/store";

export function Toolbar() {
  const title = useEditorStore((s) => s.doc.meta.title);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const dirty = useEditorStore((s) => s.dirty);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3">
      {/* 좌 — 제목 */}
      <div className="flex items-center gap-2">
        <span className="text-[15px]">✦</span>
        <span className="text-[13px] font-medium text-neutral-700">
          {title || "제목 없는 페이지"}
        </span>
        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="저장되지 않음" />}
      </div>

      {/* 중앙 — breakpoint */}
      <div className="flex overflow-hidden rounded-md border border-neutral-300">
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp.id}
            type="button"
            onClick={() => setBreakpoint(bp.id)}
            className={`px-3 py-1 text-[12px] ${
              activeBreakpoint === bp.id
                ? "bg-neutral-800 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {bp.label}
          </button>
        ))}
      </div>

      {/* 우 — undo/redo + 미리보기 */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={pastLen === 0}
          className="rounded px-2 py-1 text-[13px] text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
          title="실행 취소 (⌘Z)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={futureLen === 0}
          className="rounded px-2 py-1 text-[13px] text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
          title="다시 실행 (⇧⌘Z)"
        >
          ↷
        </button>
        <a
          href="/demo"
          target="_blank"
          rel="noreferrer"
          className="ml-1 rounded-md bg-neutral-800 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-700"
        >
          미리보기
        </a>
      </div>
    </div>
  );
}
