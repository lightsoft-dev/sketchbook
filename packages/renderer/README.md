# @sketchbook/renderer

[![npm version](https://img.shields.io/npm/v/@sketchbook/renderer.svg)](https://www.npmjs.com/package/@sketchbook/renderer)
[![license](https://img.shields.io/npm/l/@sketchbook/renderer.svg)](./LICENSE)

Sketchbook 의 **노드 트리 PageDocument 모델 + 유니버설 렌더러**.
같은 JSON 문서가 어디서 렌더되든(서버·클라이언트·외부 앱) 정확히 같은 결과를 만들도록 설계된 라이브러리입니다.

## 특징

- 🎯 **단일 렌더러** — 한 컴포넌트가 RSC / 클라이언트 / iframe 어디서나 같은 출력
- 🌐 **JS-0 게시** — 컴파일된 CSS 한 덩이만 인라인, 반응형은 media query 로 작동
- 📐 **CSS 부분집합 모델** — 자체 레이아웃 엔진 없음. flexbox / positioning 그대로 매핑
- 🔒 **닫힌 노드 타입 집합** — 임의 HTML 차단(XSS 방지) + Zod 참조 무결성 검증
- 🅰️ **Google Fonts 자동 로드** — 문서에서 쓰이는 폰트만 추려 한 줄 `<link>` 주입
- ↩️ **스키마 마이그레이션** — `schemaVersion` + `migrate()` 로 모델 진화 흡수
- 📦 **트리쉐이크 친화** — `sideEffects: false`, ESM only, React peerDependency

## 설치

```bash
npm install @sketchbook/renderer
# or
pnpm add @sketchbook/renderer
# or
yarn add @sketchbook/renderer
```

`react@19` / `react-dom@19` 가 peerDependency 입니다 — 호스트 앱에 이미 있어야 합니다.

### 요구사항

- Node.js `>= 18.17`
- React `^19`, React DOM `^19`
- Next.js 사용 시: 14.x+ (App Router 권장). 모노레포 워크스페이스 형태로 사용한다면 `next.config.ts` 에 `transpilePackages: ["@sketchbook/renderer"]` 추가.

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

## 메인테이너용 — 빌드 / 배포

```bash
# 빌드 산출물 생성
npm run build

# 패키징 결과 확인 (실제 publish 없이)
npm run publish:dry

# npm 공개 게시 (--access public 자동)
npm run publish:public
```

스크롭이 다른 경우(예: `@your-org/sketchbook-renderer`)로 게시하려면
`package.json` 의 `name` 만 바꾸고 동일하게 진행하면 됩니다.
처음 게시 전 npm 로그인 필요: `npm login`.

### 버전 올리기

[Semver](https://semver.org/lang/ko/) 를 따릅니다.

```bash
npm version patch   # 0.1.0 → 0.1.1 (호환되는 버그 수정)
npm version minor   # 0.1.0 → 0.2.0 (호환되는 기능 추가)
npm version major   # 0.1.0 → 1.0.0 (breaking change)
```

`schemaVersion` 변경(노드 모델 진화) 시 반드시 `migrations.ts` 에 변환 함수를 추가하고 minor 이상 올립니다.

## 라이선스

[MIT](./LICENSE).
