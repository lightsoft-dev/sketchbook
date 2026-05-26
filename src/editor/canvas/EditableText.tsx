/**
 * EditableText — 캔버스 내 인라인 텍스트 편집.
 *
 * 더블클릭으로 진입하면 해당 텍스트 노드만 contentEditable 로 전환된다.
 * 편집 중에는 React 가 텍스트를 재렌더하지 않도록 분리된 컴포넌트로 운영(커서 점프 방지).
 * Esc / Enter / blur 시 최종 텍스트를 store 에 커밋한다.
 */

"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { TextNode } from "@sketchbook/renderer";
import { useEditorStore } from "../state/store";

export function EditableText({
  node,
  className,
}: {
  node: TextNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  // 마운트 시 포커스 + 전체 선택.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const range = doc.createRange();
    range.selectNodeContents(el);
    const sel = doc.defaultView?.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);

  const commit = () => {
    const text = ref.current?.innerText ?? "";
    if (text !== node.props.text) {
      useEditorStore.getState().updateProps(node.id, { text });
    }
    useEditorStore.getState().setEditingText(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // 변경 취소
      if (ref.current) ref.current.innerText = node.props.text;
      useEditorStore.getState().setEditingText(null);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const Tag = (node.props.as ?? "p") as keyof React.JSX.IntrinsicElements;
  const Tagged = Tag as unknown as "p";

  return (
    <Tagged
      ref={ref as unknown as React.RefObject<HTMLParagraphElement>}
      className={className}
      data-node-id={node.id}
      data-sk-editing=""
      contentEditable
      suppressContentEditableWarning
      onBlur={commit}
      onKeyDown={onKeyDown}
      style={{
        outline: "2px solid #4f46e5",
        outlineOffset: "-2px",
        cursor: "text",
        minWidth: 8,
      }}
    >
      {node.props.text}
    </Tagged>
  );
}
