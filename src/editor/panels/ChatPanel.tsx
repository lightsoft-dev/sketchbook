/**
 * ChatPanel — 채팅으로 페이지를 편집한다.
 * 우하단에 떠 있는 토글 버튼 + 펼치면 메시지 목록 + 입력.
 *
 * 흐름: 사용자 메시지 → 서버 액션 → PatchOp[] → 클라이언트에서 단일 Command 로 적용.
 */

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { aiChatEdit } from "@/server/ai/chat-edit";
import { applyChatOps } from "../state/chat-patch";
import { useEditorStore } from "../state/store";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  error?: boolean;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, startAi] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  const doc = useEditorStore((s) => s.doc);
  const selectedId = useEditorStore((s) => s.selectedIds[0] ?? null);

  // 메시지가 추가되면 스크롤을 맨 아래로.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  const send = () => {
    const text = input.trim();
    if (!text || pending) return;
    const userMsgId = nextId.current++;
    setMessages((m) => [...m, { id: userMsgId, role: "user", text }]);
    setInput("");

    startAi(async () => {
      // 호출 시점의 doc/선택 상태 스냅샷을 보낸다.
      const docSnapshot = useEditorStore.getState().doc;
      const sel = useEditorStore.getState().selectedIds[0] ?? null;
      const result = await aiChatEdit(docSnapshot, sel, text);
      if (result.ok) {
        applyChatOps(result.ops);
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "ai",
            text: result.message || `${result.ops.length}개 변경 적용`,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { id: nextId.current++, role: "ai", text: result.error, error: true },
        ]);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg hover:bg-indigo-500"
        title="AI 채팅 편집"
      >
        <span>✦</span>
        AI 채팅
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-700">
          <span className="text-indigo-500">✦</span> AI 채팅 편집
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-neutral-700"
          title="닫기"
        >
          ✕
        </button>
      </div>

      {/* 메시지 목록 */}
      <div ref={listRef} className="flex-1 overflow-auto px-3 py-3 text-[12px]">
        {messages.length === 0 && !pending && (
          <div className="text-[12px] text-neutral-400">
            {selectedId
              ? `선택된 노드: "${doc.nodes[selectedId]?.name}"`
              : "노드를 선택하면 그 노드에 대해 지시할 수 있어요."}
            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="font-medium text-neutral-500">예시 지시</div>
              <Suggestion onPick={setInput} text="이 버튼 더 크게 만들어줘" />
              <Suggestion onPick={setInput} text="히어로 배경을 좀 더 따뜻한 톤으로" />
              <Suggestion onPick={setInput} text="모바일에서 폰트 크기 살짝 줄여줘" />
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-1.5 leading-snug ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : m.error
                    ? "bg-red-50 text-red-700"
                    : "bg-neutral-100 text-neutral-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {pending && (
          <div className="mb-2 flex justify-start">
            <div className="max-w-[85%] rounded-xl bg-neutral-100 px-3 py-1.5 text-neutral-500">
              <span className="inline-block animate-pulse">생각 중…</span>
            </div>
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="border-t border-neutral-200 p-2">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-md border border-neutral-300 px-2 py-1.5 text-[12px] outline-none focus:border-indigo-400"
            rows={2}
            placeholder="어떻게 바꿀까요?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={pending}
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || !input.trim()}
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}

function Suggestion({ text, onPick }: { text: string; onPick: (t: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(text)}
      className="block w-full rounded border border-neutral-200 px-2 py-1 text-left text-[11px] text-neutral-600 hover:border-indigo-300 hover:bg-indigo-50"
    >
      {text}
    </button>
  );
}
