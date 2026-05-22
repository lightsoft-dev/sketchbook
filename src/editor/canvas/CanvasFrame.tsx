/**
 * CanvasFrame — 에디터 캔버스를 iframe 으로 격리하고 React 트리를 portal 로 주입한다.
 *
 * iframe 인 이유:
 *  - CSS 격리: 에디터 UI(Tailwind)와 사용자 콘텐츠 스타일이 서로 누출되지 않는다.
 *  - 진짜 viewport: iframe 너비 = 실제 viewport 너비 → `@media` 가 실제로 동작해
 *    breakpoint 미리보기가 게시 결과와 100% 일치한다.
 */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function CanvasFrame({
  width,
  children,
  onDocument,
}: {
  width: number;
  children: ReactNode;
  /** iframe 문서가 준비되면 정확히 한 번 호출된다(상호작용 리스너 부착용). */
  onDocument?: (doc: Document) => void;
}) {
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!iframeEl) return;
    let done = false;
    const setup = () => {
      if (done) return;
      const d = iframeEl.contentDocument;
      if (d?.body) {
        done = true;
        d.documentElement.style.height = "100%";
        d.body.style.margin = "0";
        d.body.style.minHeight = "100%";
        setBody(d.body);
        onDocument?.(d);
      }
    };
    setup();
    iframeEl.addEventListener("load", setup);
    return () => iframeEl.removeEventListener("load", setup);
    // onDocument 는 부모가 안정적 콜백을 넘긴다고 가정 → 의존성 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeEl]);

  return (
    <iframe
      ref={setIframeEl}
      title="편집 캔버스"
      style={{
        width,
        height: "100%",
        border: "none",
        background: "#ffffff",
        display: "block",
        boxShadow: "0 1px 12px rgba(0,0,0,0.08)",
      }}
    >
      {body ? createPortal(children, body) : null}
    </iframe>
  );
}
