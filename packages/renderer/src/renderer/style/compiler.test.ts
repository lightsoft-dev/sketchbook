import { describe, expect, it } from "vitest";
import { createSampleDocument } from "../../document/fixtures";
import type { ResponsiveStyle } from "../../document/types";
import { compileDocument, compileStyle } from "./compiler";
import { stylePropsToCss } from "./cssMap";

describe("stylePropsToCss", () => {
  it("숫자 길이를 px 로 변환한다", () => {
    expect(stylePropsToCss({ width: 100 })).toEqual({ width: "100px" });
  });

  it("문자열 길이는 그대로 둔다", () => {
    expect(stylePropsToCss({ width: "100%" })).toEqual({ width: "100%" });
  });

  it("line-height 숫자는 단위 없이 출력한다", () => {
    expect(stylePropsToCss({ lineHeight: 1.5 })).toEqual({ "line-height": "1.5" });
  });

  it("BoxValue 를 4방향 단축 속성으로 변환한다", () => {
    expect(
      stylePropsToCss({ padding: { top: 1, right: 2, bottom: 3, left: 4 } }),
    ).toEqual({ padding: "1px 2px 3px 4px" });
  });

  it("solid fill 을 background 로 변환한다", () => {
    expect(stylePropsToCss({ background: { type: "solid", color: "#fff" } })).toEqual({
      background: "#fff",
    });
  });
});

describe("compileStyle", () => {
  it("동일한 스타일은 동일한 클래스명을 만든다", () => {
    const s: ResponsiveStyle = { base: { width: 100 } };
    expect(compileStyle(s).className).toBe(compileStyle({ base: { width: 100 } }).className);
  });

  it("다른 스타일은 다른 클래스명을 만든다", () => {
    const a = compileStyle({ base: { width: 100 } }).className;
    const b = compileStyle({ base: { width: 200 } }).className;
    expect(a).not.toBe(b);
  });

  it("tablet/mobile override 를 media query 로 출력한다", () => {
    const { css } = compileStyle({
      base: { fontSize: 52 },
      tablet: { fontSize: 40 },
      mobile: { fontSize: 32 },
    });
    expect(css).toContain("@media (max-width:1024px)");
    expect(css).toContain("@media (max-width:640px)");
    expect(css).toContain("font-size:32px");
  });
});

describe("compileDocument", () => {
  it("모든 노드에 클래스명을 부여한다", () => {
    const doc = createSampleDocument();
    const { classNames } = compileDocument(doc);
    for (const id of Object.keys(doc.nodes)) {
      expect(classNames[id]).toBeTruthy();
    }
  });

  it("CSS 를 한 덩어리 문자열로 모은다", () => {
    const doc = createSampleDocument();
    const { css } = compileDocument(doc);
    expect(css.length).toBeGreaterThan(0);
    // 동일 스타일(feature 카드)이 있어도 클래스는 중복 출력되지 않는다.
    const sampleClass = compileDocument(doc).classNames[doc.rootId];
    const occurrences = css.split(`.${sampleClass}{`).length - 1;
    expect(occurrences).toBeLessThanOrEqual(1);
  });
});
