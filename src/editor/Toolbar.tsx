/**
 * Toolbar — 상단바. Undo/Redo, breakpoint 전환, 저장 상태, 미리보기, 게시.
 */

"use client";

import { useState, useTransition } from "react";
import { BREAKPOINTS } from "@/document/types";
import { publishPage } from "@/server/actions/page-actions";
import { useEditorStore } from "./state/store";

export function Toolbar() {
  const title = useEditorStore((s) => s.doc.meta.title);
  const slug = useEditorStore((s) => s.doc.meta.slug);
  const pageId = useEditorStore((s) => s.pageId);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const dirty = useEditorStore((s) => s.dirty);
  const saveState = useEditorStore((s) => s.saveState);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const saveError = useEditorStore((s) => s.saveError);

  const [publishing, startPublish] = useTransition();
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const onPublish = () => {
    if (!pageId) return;
    setPublishMsg(null);
    startPublish(async () => {
      const result = await publishPage(pageId);
      if (result.ok) {
        setPublishMsg("게시 완료");
        setTimeout(() => setPublishMsg(null), 2500);
      } else {
        setPublishMsg(`게시 실패: ${result.error}`);
      }
    });
  };

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3">
      {/* 좌 — 제목 + 저장 상태 */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[15px]">✦</span>
        <span className="truncate text-[13px] font-medium text-neutral-700">
          {title || "제목 없는 페이지"}
        </span>
        <SaveBadge
          dirty={dirty}
          saveState={saveState}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
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

      {/* 우 — undo/redo + 미리보기 + 게시 */}
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
          href={`/p/${slug || "home"}`}
          target="_blank"
          rel="noreferrer"
          className="ml-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50"
        >
          미리보기
        </a>
        <button
          type="button"
          onClick={onPublish}
          disabled={!pageId || publishing}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          title="현재 draft 를 게시합니다"
        >
          {publishing ? "게시 중…" : "게시"}
        </button>
        {publishMsg && (
          <span
            className={`ml-2 text-[11px] ${
              publishMsg.startsWith("게시 완료")
                ? "text-emerald-600"
                : "text-red-500"
            }`}
          >
            {publishMsg}
          </span>
        )}
      </div>
    </div>
  );
}

function SaveBadge({
  dirty,
  saveState,
  lastSavedAt,
  saveError,
}: {
  dirty: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  saveError: string | null;
}) {
  if (saveState === "saving") {
    return <span className="text-[11px] text-neutral-400">저장 중…</span>;
  }
  if (saveState === "error") {
    return (
      <span className="text-[11px] text-red-500" title={saveError ?? undefined}>
        저장 실패
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> 변경됨
      </span>
    );
  }
  if (lastSavedAt) {
    const t = new Date(lastSavedAt);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    return (
      <span className="text-[11px] text-neutral-400">{`저장됨 · ${hh}:${mm}`}</span>
    );
  }
  return null;
}
