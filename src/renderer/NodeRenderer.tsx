/**
 * 유니버설 노드 렌더러 — 같은 컴포넌트가 게시 페이지(view)와 에디터 캔버스(edit)를
 * 모두 그린다. 분기는 오직 `mode` prop.
 *
 * 이 컴포넌트는 훅을 쓰지 않으므로 RSC(게시)와 클라이언트(에디터) 양쪽에서 동작한다.
 * 선택/드래그 같은 상호작용은 이 트리가 아니라 에디터의 오버레이가 담당한다 —
 * 렌더러는 `data-node-id` 만 노출한다.
 */

import type { JSX } from "react";
import type { Node, NodeId, PageDocument } from "@/document/types";

export type RenderMode = "view" | "edit";

export interface RenderContext {
  doc: PageDocument;
  /** compileDocument 결과 — 노드 id → 클래스명. */
  classNames: Record<NodeId, string>;
  mode: RenderMode;
}

export function NodeRenderer({
  nodeId,
  ctx,
}: {
  nodeId: NodeId;
  ctx: RenderContext;
}): JSX.Element | null {
  const node = ctx.doc.nodes[nodeId];
  if (!node) return null;

  const className = ctx.classNames[nodeId] || undefined;
  // data-node-id 는 에디터가 DOM↔노드를 잇는 핸들. view 에서도 무해해 항상 부여.
  const dataAttr = { "data-node-id": node.id };

  switch (node.type) {
    case "Frame": {
      const Tag = (node.props.as ?? "div") as keyof JSX.IntrinsicElements;
      return (
        <Tag className={className} {...dataAttr}>
          {node.children.map((cid) => (
            <NodeRenderer key={cid} nodeId={cid} ctx={ctx} />
          ))}
        </Tag>
      );
    }

    case "Text": {
      const Tag = (node.props.as ?? "p") as keyof JSX.IntrinsicElements;
      return (
        <Tag className={className} {...dataAttr}>
          {node.props.text}
        </Tag>
      );
    }

    case "Image": {
      const src = node.props.src;
      if (!src) {
        // src 없음 → 플레이스홀더(AI 생성 대기 등).
        return (
          <div
            className={className}
            {...dataAttr}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f0f0f0",
              color: "#999",
              fontSize: 13,
            }}
          >
            이미지 없음
          </div>
        );
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={className} {...dataAttr} src={src} alt={node.props.alt} />
      );
    }

    case "Button": {
      const content = node.props.label;
      if (node.props.href && ctx.mode === "view") {
        return (
          <a
            className={className}
            {...dataAttr}
            href={sanitizeHref(node.props.href)}
            target={node.props.target ?? "_self"}
            rel={node.props.target === "_blank" ? "noopener noreferrer" : undefined}
          >
            {content}
          </a>
        );
      }
      // 에디터에서는 클릭이 선택 동작이어야 하므로 링크 이동을 막는다 → button 태그.
      return (
        <button className={className} {...dataAttr} type="button">
          {content}
        </button>
      );
    }
  }
}

/** XSS 방지 — http(s) 가 아닌 href(javascript: 등)는 차단한다. */
function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }
  return "#";
}

export type { Node };
