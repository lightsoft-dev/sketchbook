/**
 * 문서 모델 — 페이지를 표현하는 단일 진실 원천(Single Source of Truth).
 *
 * 정본은 정규화된 플랫 맵: `nodes: Record<NodeId, Node>` + 각 노드의 `children: NodeId[]`.
 * 에디터·게시·AI 가 모두 이 모델을 공유한다.
 */

export type NodeId = string;

/** 반응형 breakpoint. base = 데스크탑 기준(desktop-first). */
export type BreakpointId = "base" | "tablet" | "mobile";

export interface BreakpointDef {
  id: BreakpointId;
  label: string;
  /** 이 breakpoint 가 발동하는 최대 너비. base 는 없음(기본). */
  maxWidth?: number;
  /** 에디터 캔버스에서 이 breakpoint 를 미리볼 때의 기본 너비. */
  canvasWidth: number;
}

export const BREAKPOINTS: BreakpointDef[] = [
  { id: "base", label: "Desktop", canvasWidth: 1280 },
  { id: "tablet", label: "Tablet", maxWidth: 1024, canvasWidth: 834 },
  { id: "mobile", label: "Mobile", maxWidth: 640, canvasWidth: 390 },
];

/** 닫힌 노드 타입 집합 — XSS/렌더 안정성을 위해 임의 타입을 허용하지 않는다. */
export type NodeType = "Frame" | "Text" | "Image" | "Button";

export const NODE_TYPES: NodeType[] = ["Frame", "Text", "Image", "Button"];

// ─────────────────────────────────────────────────────────────
// 스타일 — CSS 부분집합. 자체 레이아웃 엔진을 만들지 않고 CSS 에 1:1 매핑한다.
// ─────────────────────────────────────────────────────────────

/** 숫자는 px 로 해석. 문자열은 "100%", "auto", "1.5rem" 등 그대로. */
export type Length = number | string;

/** 색상 — hex/rgb 문자열, 또는 디자인 토큰 참조 "var(--token)". */
export type ColorValue = string;

export interface BoxValue {
  top: Length;
  right: Length;
  bottom: Length;
  left: Length;
}

export interface Shadow {
  x: Length;
  y: Length;
  blur: Length;
  spread: Length;
  color: ColorValue;
  inset?: boolean;
}

export type Fill =
  | { type: "solid"; color: ColorValue }
  | { type: "gradient"; css: string }
  | { type: "image"; src: string; size: "cover" | "contain" };

export type FlexAlign =
  | "flex-start"
  | "center"
  | "flex-end"
  | "stretch"
  | "space-between"
  | "space-around"
  | "baseline";

/** 한 breakpoint 에서의 스타일. 모든 속성은 선택적(미지정 = 상속 또는 브라우저 기본). */
export interface StyleProps {
  // ── 레이아웃 (Frame 이 자식을 배치하는 규칙 = 오토레이아웃) ──
  display?: "flex" | "block" | "grid" | "none";
  flexDirection?: "row" | "column";
  flexWrap?: "nowrap" | "wrap";
  justifyContent?: FlexAlign;
  alignItems?: FlexAlign;
  gap?: Length;

  // ── 이 노드가 부모 flex 안에서 차지하는 방식 (자식 입장) ──
  flexGrow?: number;
  flexShrink?: number;
  alignSelf?: FlexAlign | "auto";

  // ── 위치 (자유 배치 시) ──
  position?: "relative" | "absolute" | "sticky";
  top?: Length;
  right?: Length;
  bottom?: Length;
  left?: Length;
  zIndex?: number;

  // ── 크기 ──
  width?: Length;
  height?: Length;
  minWidth?: Length;
  minHeight?: Length;
  maxWidth?: Length;
  maxHeight?: Length;

  // ── 박스 ──
  padding?: BoxValue;
  margin?: BoxValue;
  borderRadius?: BoxValue;
  borderWidth?: BoxValue;
  borderColor?: ColorValue;
  borderStyle?: "solid" | "dashed" | "none";

  // ── 외형 ──
  background?: Fill;
  opacity?: number;
  boxShadow?: Shadow[];
  overflow?: "visible" | "hidden" | "auto";

  // ── 타이포 (Text/Button) ──
  color?: ColorValue;
  fontFamily?: string;
  fontSize?: Length;
  fontWeight?: number;
  lineHeight?: Length;
  letterSpacing?: Length;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";

  // ── 이미지 ──
  objectFit?: "cover" | "contain" | "fill" | "none";
}

/** base(필수) + breakpoint 부분 override. */
export interface ResponsiveStyle {
  base: StyleProps;
  tablet?: StyleProps;
  mobile?: StyleProps;
}

// ─────────────────────────────────────────────────────────────
// 노드
// ─────────────────────────────────────────────────────────────

/** 노드가 부모 레이아웃 안에서 흐름을 따르는지(flow), 자유 배치인지(absolute). */
export type LayoutMode = "flow" | "absolute";

export interface NodeBase {
  id: NodeId;
  type: NodeType;
  /** 레이어 패널 표시명. */
  name: string;
  parentId: NodeId | null;
  /** 자식 노드 id 순서 목록. leaf 노드는 빈 배열. */
  children: NodeId[];
  style: ResponsiveStyle;
  layoutMode?: LayoutMode;
  /** breakpoint 별 표시/숨김. */
  hidden?: Partial<Record<BreakpointId, boolean>>;
  /** 에디터에서 선택 잠금. */
  locked?: boolean;
}

/** 컨테이너 — 자식을 가질 수 있는 유일한 타입. */
export interface FrameNode extends NodeBase {
  type: "Frame";
  props: {
    as?: "div" | "section" | "header" | "footer" | "nav" | "main" | "article";
  };
}

export interface TextNode extends NodeBase {
  type: "Text";
  children: [];
  props: {
    text: string;
    as?: "p" | "h1" | "h2" | "h3" | "h4" | "span";
  };
}

export interface ImageNode extends NodeBase {
  type: "Image";
  children: [];
  props: {
    src?: string;
    alt: string;
  };
}

export interface ButtonNode extends NodeBase {
  type: "Button";
  children: [];
  props: {
    label: string;
    href?: string;
    target?: "_self" | "_blank";
  };
}

export type Node = FrameNode | TextNode | ImageNode | ButtonNode;

export interface SeoMeta {
  title?: string;
  description?: string;
  ogImage?: string;
}

export interface PageDocument {
  schemaVersion: number;
  id: string;
  /** 항상 존재하는 최상위 Frame 노드. */
  rootId: NodeId;
  nodes: Record<NodeId, Node>;
  meta: {
    title: string;
    slug: string;
    seo?: SeoMeta;
  };
}

export const CURRENT_SCHEMA_VERSION = 1;

// ─────────────────────────────────────────────────────────────
// 트리 형태 — AI 입출력용 중첩 표현. 정본(플랫 맵)과 tree.ts 가 상호 변환한다.
// ─────────────────────────────────────────────────────────────

export interface TreeNode {
  id?: NodeId;
  type: NodeType;
  name?: string;
  style?: Partial<ResponsiveStyle>;
  layoutMode?: LayoutMode;
  hidden?: Partial<Record<BreakpointId, boolean>>;
  locked?: boolean;
  props?: Record<string, unknown>;
  children?: TreeNode[];
}
