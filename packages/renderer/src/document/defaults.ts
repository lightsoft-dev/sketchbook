/**
 * 노드/문서 생성 헬퍼 — 타입별 기본 스타일과 props 를 제공한다.
 */

import { newDocId, newNodeId } from "./ids";
import {
  CURRENT_SCHEMA_VERSION,
  type ButtonNode,
  type FrameNode,
  type ImageNode,
  type Node,
  type NodeType,
  type PageDocument,
  type StyleProps,
  type TextNode,
} from "./types";

/** 타입별 기본 base 스타일. */
function defaultStyle(type: NodeType): StyleProps {
  switch (type) {
    case "Frame":
      return {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: { top: 24, right: 24, bottom: 24, left: 24 },
        width: "100%",
      };
    case "Text":
      return {
        fontSize: 16,
        lineHeight: 1.5,
        color: "#1a1a1a",
      };
    case "Image":
      return {
        width: "100%",
        height: 240,
        objectFit: "cover",
        borderRadius: { top: 8, right: 8, bottom: 8, left: 8 },
      };
    case "Button":
      return {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: { top: 12, right: 24, bottom: 12, left: 24 },
        background: { type: "solid", color: "#1a1a1a" },
        color: "#ffffff",
        fontSize: 15,
        fontWeight: 600,
        borderRadius: { top: 8, right: 8, bottom: 8, left: 8 },
      };
  }
}

/** 타입별 기본 props. */
function defaultProps(type: NodeType): Node["props"] {
  switch (type) {
    case "Frame":
      return { as: "div" };
    case "Text":
      return { text: "텍스트", as: "p" };
    case "Image":
      return { src: undefined, alt: "" };
    case "Button":
      return { label: "버튼", target: "_self" };
  }
}

/** 타입별 기본 레이어 표시명. */
function defaultName(type: NodeType): string {
  return { Frame: "Frame", Text: "Text", Image: "Image", Button: "Button" }[type];
}

export interface CreateNodeOptions {
  id?: string;
  name?: string;
  parentId?: string | null;
  style?: Partial<StyleProps>;
  props?: Record<string, unknown>;
}

/** 단일 노드를 기본값으로 생성한다(children 은 비어 있음). */
export function createNode(type: NodeType, opts: CreateNodeOptions = {}): Node {
  const base: StyleProps = { ...defaultStyle(type), ...(opts.style ?? {}) };
  const props = { ...defaultProps(type), ...(opts.props ?? {}) };

  const common = {
    id: opts.id ?? newNodeId(),
    name: opts.name ?? defaultName(type),
    parentId: opts.parentId ?? null,
    style: { base },
  };

  switch (type) {
    case "Frame":
      return { ...common, type, children: [], props: props as FrameNode["props"] };
    case "Text":
      return { ...common, type, children: [], props: props as TextNode["props"] };
    case "Image":
      return { ...common, type, children: [], props: props as ImageNode["props"] };
    case "Button":
      return { ...common, type, children: [], props: props as ButtonNode["props"] };
  }
}

/** 루트 Frame 하나만 가진 빈 문서를 생성한다. */
export function createEmptyDocument(meta: { title: string; slug: string }): PageDocument {
  const root = createNode("Frame", {
    name: "Page",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      width: "100%",
      minHeight: "100vh",
      background: { type: "solid", color: "#ffffff" },
    },
    props: { as: "main" },
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newDocId(),
    rootId: root.id,
    nodes: { [root.id]: root },
    meta,
  };
}
