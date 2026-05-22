/**
 * 페이지 전체 렌더러 — 문서를 컴파일해 `<style>` 한 개를 주입하고 루트부터 렌더한다.
 *
 * 게시 페이지(RSC)와 에디터 캔버스가 공유한다. 게시 시 이 출력은 JS 가 거의 없는
 * 정적 HTML + 인라인 CSS 이고, media query 로 반응형이 동작한다.
 */

import type { JSX } from "react";
import type { PageDocument } from "@/document/types";
import { compileDocument } from "./style/compiler";
import { SK_RESET } from "./style/reset";
import { NodeRenderer, type RenderMode } from "./NodeRenderer";

export function PageRenderer({
  doc,
  mode = "view",
}: {
  doc: PageDocument;
  mode?: RenderMode;
}): JSX.Element {
  const compiled = compileDocument(doc);

  return (
    <>
      <style
        data-sk-styles=""
        // 컴파일된 CSS 는 우리 StyleCompiler 가 만든 신뢰 가능한 문자열.
        dangerouslySetInnerHTML={{ __html: SK_RESET + compiled.css }}
      />
      <NodeRenderer
        nodeId={doc.rootId}
        ctx={{ doc, classNames: compiled.classNames, mode }}
      />
    </>
  );
}
