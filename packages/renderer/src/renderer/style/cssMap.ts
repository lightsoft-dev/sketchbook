/**
 * `StyleProps` (CSS 부분집합) → CSS 선언 맵 변환.
 *
 * 핵심 원칙: 자체 레이아웃 엔진을 만들지 않는다. 각 속성을 실제 CSS 속성에
 * 1:1 가깝게 변환하고 계산은 브라우저(flexbox/positioning)에 맡긴다.
 */

import type {
  BoxValue,
  Fill,
  Length,
  Shadow,
  StyleProps,
} from "../../document/types";

/** 숫자는 px 로, 문자열은 그대로. */
function len(v: Length): string {
  return typeof v === "number" ? `${v}px` : v;
}

/** 단위 없는 숫자 값(line-height 등). */
function unitless(v: Length): string {
  return typeof v === "number" ? String(v) : v;
}

function box(v: BoxValue): string {
  return `${len(v.top)} ${len(v.right)} ${len(v.bottom)} ${len(v.left)}`;
}

function fillToCss(fill: Fill): Record<string, string> {
  switch (fill.type) {
    case "solid":
      return { background: fill.color };
    case "gradient":
      return { background: fill.css };
    case "image":
      return {
        "background-image": `url(${JSON.stringify(fill.src)})`,
        "background-size": fill.size,
        "background-position": "center",
        "background-repeat": "no-repeat",
      };
  }
}

function shadowToCss(shadows: Shadow[]): string {
  return shadows
    .map(
      (s) =>
        `${s.inset ? "inset " : ""}${len(s.x)} ${len(s.y)} ${len(s.blur)} ${len(
          s.spread,
        )} ${s.color}`,
    )
    .join(", ");
}

/**
 * 한 breakpoint 의 `StyleProps` 를 CSS 선언 맵(kebab-case 키)으로 변환한다.
 */
export function stylePropsToCss(props: StyleProps): Record<string, string> {
  const css: Record<string, string> = {};
  const set = (k: string, v: string | undefined) => {
    if (v !== undefined) css[k] = v;
  };

  // 레이아웃
  set("display", props.display);
  set("flex-direction", props.flexDirection);
  set("flex-wrap", props.flexWrap);
  set("justify-content", props.justifyContent);
  set("align-items", props.alignItems);
  if (props.gap !== undefined) set("gap", len(props.gap));

  // flex 자식
  if (props.flexGrow !== undefined) set("flex-grow", String(props.flexGrow));
  if (props.flexShrink !== undefined) set("flex-shrink", String(props.flexShrink));
  set("align-self", props.alignSelf);

  // 위치
  set("position", props.position);
  if (props.top !== undefined) set("top", len(props.top));
  if (props.right !== undefined) set("right", len(props.right));
  if (props.bottom !== undefined) set("bottom", len(props.bottom));
  if (props.left !== undefined) set("left", len(props.left));
  if (props.zIndex !== undefined) set("z-index", String(props.zIndex));

  // 크기
  if (props.width !== undefined) set("width", len(props.width));
  if (props.height !== undefined) set("height", len(props.height));
  if (props.minWidth !== undefined) set("min-width", len(props.minWidth));
  if (props.minHeight !== undefined) set("min-height", len(props.minHeight));
  if (props.maxWidth !== undefined) set("max-width", len(props.maxWidth));
  if (props.maxHeight !== undefined) set("max-height", len(props.maxHeight));

  // 박스
  if (props.padding) set("padding", box(props.padding));
  if (props.margin) set("margin", box(props.margin));
  if (props.borderRadius) set("border-radius", box(props.borderRadius));
  if (props.borderWidth) set("border-width", box(props.borderWidth));
  set("border-color", props.borderColor);
  set("border-style", props.borderStyle);

  // 외형
  if (props.background) Object.assign(css, fillToCss(props.background));
  if (props.opacity !== undefined) set("opacity", String(props.opacity));
  if (props.boxShadow && props.boxShadow.length > 0) {
    set("box-shadow", shadowToCss(props.boxShadow));
  }
  set("overflow", props.overflow);

  // 타이포
  set("color", props.color);
  set("font-family", props.fontFamily);
  if (props.fontSize !== undefined) set("font-size", len(props.fontSize));
  if (props.fontWeight !== undefined) set("font-weight", String(props.fontWeight));
  if (props.lineHeight !== undefined) set("line-height", unitless(props.lineHeight));
  if (props.letterSpacing !== undefined) {
    set("letter-spacing", len(props.letterSpacing));
  }
  set("text-align", props.textAlign);
  set("text-transform", props.textTransform);
  set("font-style", props.fontStyle);
  set("text-decoration", props.textDecoration);

  // 이미지
  set("object-fit", props.objectFit);

  return css;
}

/** CSS 선언 맵을 `key:value;` 문자열로 직렬화한다. */
export function cssMapToString(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}
