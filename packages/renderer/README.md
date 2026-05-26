# @sketchbook/renderer

Sketchbook 의 **노드 트리 PageDocument 모델 + 유니버설 렌더러**.
같은 JSON 문서가 어디서 렌더되든(서버·클라이언트·외부 앱) 정확히 같은 결과를 만들도록 설계된 라이브러리입니다.

## 설치

```bash
npm install @sketchbook/renderer
```

`react@19` / `react-dom@19` 가 peerDependency 입니다 — 호스트 앱에 이미 있어야 합니다.

## 빠른 시작 (Next.js App Router 예시)

DB / API / 어디서든 `PageDocument` JSON 을 가져와 그대로 `<PageRenderer>` 에 넘기면 됩니다.

```tsx
// app/page.tsx — RSC
import { PageRenderer, type PageDocument } from "@sketchbook/renderer";

async function getDoc(): Promise<PageDocument> {
  // Sketchbook DB / 자체 API / 파일 등 어디서든 가져오세요.
  const res = await fetch("https://your-cms/api/pages/home");
  return res.json();
}

export default async function Page() {
  const doc = await getDoc();
  return <PageRenderer doc={doc} mode="view" />;
}
```

게시 모드(`mode="view"`)에서는 훅 없이 동작하므로 RSC 안에서 그대로 사용 가능합니다.
컴파일된 CSS 가 `<style>` 한 개로 인라인 주입되어 JS 없이 반응형이 동작합니다.

## 핵심 export

```ts
import {
  // 타입
  type PageDocument,
  type Node,
  type NodeId,
  type StyleProps,
  type ResponsiveStyle,
  type TreeNode,

  // 렌더러
  PageRenderer,        // 페이지 전체 (style + 루트 렌더)
  NodeRenderer,        // 한 노드 재귀 렌더 (직접 조립할 때)
  compileDocument,     // 문서 → { classNames, css }
  compileStyle,        // 단일 ResponsiveStyle → CSS

  // 문서 모델
  createNode,
  createEmptyDocument,
  createSampleDocument,
  flatten,             // TreeNode → flat map
  hydrate,             // flat map → TreeNode
  walk,
  getAncestors,
  getDescendants,

  // 검증·마이그레이션
  validatePageDocument,
  zPageDocument,
  migrate,

  // 토큰
  BREAKPOINTS,
  SK_RESET,
} from "@sketchbook/renderer";
```

## 문서 모델 한눈에

`PageDocument` 는 정규화된 플랫 맵입니다.

```ts
interface PageDocument {
  schemaVersion: number;
  id: string;
  rootId: NodeId;
  nodes: Record<NodeId, Node>;
  meta: { title: string; slug: string; seo?: { ... } };
}

type Node = FrameNode | TextNode | ImageNode | ButtonNode;

interface NodeBase {
  id: NodeId;
  type: "Frame" | "Text" | "Image" | "Button";
  name: string;
  parentId: NodeId | null;
  children: NodeId[];           // leaf 는 []
  style: ResponsiveStyle;        // { base, tablet?, mobile? }
  layoutMode?: "flow" | "absolute";
  hidden?: Partial<Record<BreakpointId, boolean>>;
  locked?: boolean;
}
```

자세한 타입은 `import { ... } from "@sketchbook/renderer"` 에서 가져와 IDE 가 안내합니다.

## 외부 앱에서 자체 콘텐츠 모델로 쓰기

페이지를 직접 조립하고 싶다면 `createEmptyDocument` + `createNode` + Command 들을 직접 호출하거나
중첩 `TreeNode` 를 작성해 `flatten()` 으로 정규화하세요.

```ts
import { flatten, createNode, type TreeNode, type PageDocument } from "@sketchbook/renderer";

const tree: TreeNode = {
  type: "Frame",
  name: "Page",
  style: { base: { display: "flex", flexDirection: "column" } },
  children: [
    { type: "Text", props: { text: "안녕", as: "h1" } },
    { type: "Text", props: { text: "본문...", as: "p" } },
  ],
};

const { rootId, nodes } = flatten(tree);
const doc: PageDocument = {
  schemaVersion: 1,
  id: "doc_demo",
  rootId,
  nodes,
  meta: { title: "데모", slug: "demo" },
};
```

## 안전성

- 모든 외부 입력은 `validatePageDocument(input)` 으로 통과시킨 뒤에만 렌더 / 저장하세요.
  Zod 스키마 + 참조 무결성(rootId 존재, parent↔child 일관성)까지 확인합니다.
- `Button` 의 `href` 는 `http(s)://` / `/` / `#` 만 허용 (XSS 방지).
- 노드 타입은 닫힌 집합 — 임의 HTML 삽입 불가.

## 버전 마이그레이션

`schemaVersion` 이 진화하면 `migrate(doc)` 가 최신으로 끌어올립니다.
호스트 앱은 저장된 문서를 읽을 때 한 번 거쳐 주면 됩니다.

```ts
const upgraded = migrate(rawDoc);
```

## 라이선스

MIT.
