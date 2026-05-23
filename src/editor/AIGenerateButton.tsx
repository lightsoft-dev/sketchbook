/**
 * AIGenerateButton — 자연어 프롬프트로 현재 페이지의 draft 를 AI 가 다시 만든다.
 * 결과는 DB draft 에 즉시 저장되고, 스토어에 reload 되어 캔버스가 갱신된다.
 */

"use client";

import { useState, useTransition } from "react";
import { aiGeneratePage } from "@/server/ai/generate-page";
import { useEditorStore } from "./state/store";

export function AIGenerateButton() {
  const pageId = useEditorStore((s) => s.pageId);
  const loadDocument = useEditorStore((s) => s.loadDocument);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startAi] = useTransition();

  const run = () => {
    if (!pageId || !prompt.trim()) return;
    setError(null);
    startAi(async () => {
      const result = await aiGeneratePage(pageId, prompt);
      if (result.ok) {
        loadDocument(result.doc, pageId);
        setOpen(false);
        setPrompt("");
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[12px] font-medium text-indigo-700 hover:bg-indigo-100"
        title="AI 로 페이지 다시 만들기"
      >
        <span>✦</span> AI 페이지
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-2xl">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                ✦ AI 페이지 생성
              </div>
              <h2 className="mt-0.5 text-[15px] font-semibold text-neutral-800">
                어떤 페이지로 다시 만들까요?
              </h2>
              <p className="mt-1 text-[12px] text-neutral-500">
                현재 draft 가 새 내용으로 교체됩니다. 게시 전에는 영향이 없습니다.
              </p>
            </div>
            <textarea
              className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
              rows={5}
              placeholder="예: 도시에서 작은 도자기 공방을 운영하는 작가의 포트폴리오 페이지. 따뜻한 베이지 톤, 작품 그리드, 짧은 소개와 인스타그램 링크."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoFocus
            />
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
                {error}
              </div>
            )}
            {pending && (
              <div className="text-[11px] text-neutral-500">
                Claude Sonnet 으로 구조 생성 중… (보통 10–20초)
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-[12px] text-neutral-700 hover:bg-neutral-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending || !prompt.trim() || !pageId}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {pending ? "생성 중…" : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
