/**
 * AICopyButton — Text/Button 노드의 텍스트를 AI 로 다듬는 작은 UI.
 * 모드 드롭다운 → 서버 액션 호출 → 결과를 곧바로 onApply 로 전달.
 * (실수해도 Cmd+Z 로 되돌릴 수 있어 미리보기 단계는 두지 않음.)
 */

"use client";

import { useState, useTransition } from "react";
import {
  aiCopywrite,
  type CopywriteInput,
} from "@/server/ai/copywrite";

const MODES: { value: CopywriteInput["mode"]; label: string }[] = [
  { value: "improve", label: "다듬기" },
  { value: "shorten", label: "더 짧게" },
  { value: "expand", label: "길게 풀어쓰기" },
  { value: "rewrite", label: "다른 표현으로" },
];

export function AICopyButton({
  text,
  context,
  onApply,
}: {
  text: string;
  context?: string;
  onApply: (newText: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startAi] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (mode: CopywriteInput["mode"]) => {
    setError(null);
    setOpen(false);
    startAi(async () => {
      const result = await aiCopywrite({ text, mode, context });
      if (result.ok) {
        onApply(result.text);
      } else {
        setError(
          result.code === "MISSING_API_KEY"
            ? "ANTHROPIC_API_KEY 가 필요합니다 (.env)"
            : result.error,
        );
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending || !text.trim()}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        <span>✦</span>
        {pending ? "AI 작업 중…" : "AI 도움"}
        <span className="text-[9px] opacity-60">▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => run(m.value)}
              className="block w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-indigo-50"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-1 max-w-[200px] rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
