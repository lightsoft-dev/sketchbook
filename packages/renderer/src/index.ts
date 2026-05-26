/**
 * @sketchbook/renderer — 노드 트리 PageDocument 모델 + 유니버설 렌더러.
 *
 * 같은 PageDocument 가 어디서 렌더되든 같은 결과가 나오게 하는 것이 목표.
 * 에디터(client)·게시 페이지(RSC)·외부 Next.js 앱이 모두 이 패키지를 공유한다.
 */

// ── 문서 모델 ──
export * from "./document/types";
export {
  newDocId,
  newNodeId,
} from "./document/ids";
export {
  createNode,
  createEmptyDocument,
  type CreateNodeOptions,
} from "./document/defaults";
export {
  flatten,
  hydrate,
  walk,
  getAncestors,
  getDescendants,
  isDescendantOf,
  pruneOrphans,
  type FlattenResult,
} from "./document/tree";
export {
  zPageDocument,
  validatePageDocument,
  type ValidationResult,
} from "./document/schema";
export { migrate, isFutureVersion } from "./document/migrations";
export { createSampleDocument } from "./document/fixtures";

// ── 렌더러 ──
export { NodeRenderer, type RenderContext, type RenderMode } from "./renderer/NodeRenderer";
export { PageRenderer } from "./renderer/PageRenderer";
export {
  compileStyle,
  compileDocument,
  resolveEffectiveStyle,
  type CompiledStyle,
  type CompiledDocument,
} from "./renderer/style/compiler";
export { stylePropsToCss, cssMapToString } from "./renderer/style/cssMap";
export { SK_RESET } from "./renderer/style/reset";
