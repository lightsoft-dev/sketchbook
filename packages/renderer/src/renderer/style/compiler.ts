/**
 * StyleCompiler — `ResponsiveStyle` → 결정적(deterministic) 클래스명 + CSS.
 *
 * 동일한 스타일은 같은 해시 → 같은 클래스명을 공유한다(중복 제거).
 * base 는 기본 룰, tablet/mobile 은 `@media` 안의 diff 로만 출력 → JS 없이 반응형.
 * 같은 컴파일러를 에디터(iframe)와 게시 페이지가 공유한다.
 */

import { BREAKPOINTS, type Node, type NodeId, type PageDocument, type ResponsiveStyle } from "../../document/types";
import { cssMapToString, stylePropsToCss } from "./cssMap";

/** 문자열 → 짧은 안정적 해시(djb2 변형). */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // 부호 없는 32bit → base36
  return (h >>> 0).toString(36);
}

const tabletDef = BREAKPOINTS.find((b) => b.id === "tablet")!;
const mobileDef = BREAKPOINTS.find((b) => b.id === "mobile")!;

export interface CompiledStyle {
  className: string;
  css: string;
}

/**
 * 하나의 `ResponsiveStyle` 을 클래스명 + CSS 규칙으로 컴파일한다.
 * 빈 스타일이면 className 은 빈 문자열, css 도 빈 문자열.
 */
export function compileStyle(style: ResponsiveStyle): CompiledStyle {
  const key = JSON.stringify(style);
  const className = `sk-${hash(key)}`;

  const rules: string[] = [];

  const baseDecl = cssMapToString(stylePropsToCss(style.base));
  if (baseDecl) rules.push(`.${className}{${baseDecl}}`);

  if (style.tablet) {
    const decl = cssMapToString(stylePropsToCss(style.tablet));
    if (decl) {
      rules.push(
        `@media (max-width:${tabletDef.maxWidth}px){.${className}{${decl}}}`,
      );
    }
  }
  if (style.mobile) {
    const decl = cssMapToString(stylePropsToCss(style.mobile));
    if (decl) {
      rules.push(
        `@media (max-width:${mobileDef.maxWidth}px){.${className}{${decl}}}`,
      );
    }
  }

  return { className, css: rules.join("\n") };
}

export interface CompiledDocument {
  /** 노드 id → 적용할 클래스명. */
  classNames: Record<NodeId, string>;
  /** 페이지 전체 CSS(중복 제거됨). `<style>` 한 개로 주입한다. */
  css: string;
}

/**
 * 문서의 모든 노드 스타일을 컴파일한다.
 * 같은 스타일을 가진 노드들은 같은 클래스를 공유하고 CSS 는 한 번만 출력된다.
 */
export function compileDocument(doc: PageDocument): CompiledDocument {
  const classNames: Record<NodeId, string> = {};
  const seen = new Map<string, string>(); // className → css

  for (const node of Object.values(doc.nodes) as Node[]) {
    const style = resolveEffectiveStyle(node, doc);
    const { className, css } = compileStyle(style);
    classNames[node.id] = className;
    if (className && !seen.has(className)) {
      seen.set(className, css);
    }
  }

  return {
    classNames,
    css: Array.from(seen.values()).filter(Boolean).join("\n"),
  };
}

/**
 * 노드의 "실효 스타일"을 계산한다 — 저장된 스타일에 다음을 반영:
 *  - layoutMode "absolute" → position:absolute 보장
 *  - absolute 자식을 가진 Frame → position:relative 보장(positioning context)
 *  - hidden[bp] → 해당 breakpoint 에서 display:none
 */
export function resolveEffectiveStyle(node: Node, doc: PageDocument): ResponsiveStyle {
  const style: ResponsiveStyle = {
    base: { ...node.style.base },
    ...(node.style.tablet ? { tablet: { ...node.style.tablet } } : {}),
    ...(node.style.mobile ? { mobile: { ...node.style.mobile } } : {}),
  };

  // 자유 배치 노드: position 미지정이면 absolute 부여.
  if (node.layoutMode === "absolute" && !style.base.position) {
    style.base.position = "absolute";
  }

  // absolute 자식을 품은 Frame: positioning context 제공.
  if (node.type === "Frame") {
    const hasAbsoluteChild = node.children.some(
      (cid) => doc.nodes[cid]?.layoutMode === "absolute",
    );
    if (hasAbsoluteChild && !style.base.position) {
      style.base.position = "relative";
    }
  }

  // breakpoint 별 표시/숨김.
  if (node.hidden) {
    if (node.hidden.base) style.base.display = "none";
    if (node.hidden.tablet) style.tablet = { ...style.tablet, display: "none" };
    if (node.hidden.mobile) style.mobile = { ...style.mobile, display: "none" };
  }

  return style;
}
