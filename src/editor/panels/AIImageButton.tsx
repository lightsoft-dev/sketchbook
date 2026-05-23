/**
 * AIImageButton — Image 노드에 AI 로 새 이미지를 생성한다.
 * 프롬프트 입력 + 종횡비 선택 → Replicate 호출 → 성공 시 src 갱신.
 */

"use client";

import { useState, useTransition } from "react";
import {
  aiGenerateImage,
  type GenerateImageInput,
} from "@/server/ai/generate-image";

export function AIImageButton({
  onApply,
}: {
  onApply: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<GenerateImageInput["aspectRatio"]>("16:9");
  const [error, setError] = useState<string | null>(null);
  const [pending, startAi] = useTransition();

  const run = () => {
    if (!prompt.trim()) return;
    setError(null);
    startAi(async () => {
      const result = await aiGenerateImage({ prompt, aspectRatio: aspect });
      if (result.ok) {
        onApply(result.url);
        setOpen(false);
        setPrompt("");
      } else {
        setError(
          result.code === "MISSING_API_KEY"
            ? "REPLICATE_API_TOKEN 이 필요합니다 (.env)"
            : result.error,
        );
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[12px] text-indigo-700 hover:bg-indigo-100"
      >
        <span>✦</span>
        AI 로 이미지 생성
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
          <textarea
            className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
            rows={3}
            placeholder="만들고 싶은 이미지 설명…&#10;예: 따뜻한 햇살이 드는 카페 창가, 빈티지 필름 톤"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <select
              value={aspect}
              onChange={(e) =>
                setAspect(e.target.value as GenerateImageInput["aspectRatio"])
              }
              className="rounded border border-neutral-300 px-1 py-1 text-[11px]"
            >
              <option value="16:9">16:9 (와이드)</option>
              <option value="1:1">1:1 (정사각)</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4 (세로)</option>
              <option value="9:16">9:16 (모바일)</option>
              <option value="21:9">21:9 (시네마)</option>
            </select>
            <button
              type="button"
              onClick={run}
              disabled={pending || !prompt.trim()}
              className="rounded bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {pending ? "생성 중…" : "생성"}
            </button>
          </div>
          {pending && (
            <div className="text-[10px] text-neutral-500">
              Flux 모델로 생성 중 (보통 2–5초)…
            </div>
          )}
          {error && (
            <div className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
