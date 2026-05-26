<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Next.js 16 + React 19 + Turbopack — 학습 데이터의 Next 와 다를 수 있습니다. 의심스러우면 `node_modules/next/dist/docs/` 를 먼저 확인하세요. deprecation 경고는 무시하지 말 것.
<!-- END:nextjs-agent-rules -->

# Sketchbook — 코딩 에이전트 셋업 가이드

이 문서를 위에서부터 순서대로 실행하면 **0 에서 동작하는 에디터·게시 페이지까지** 도달합니다.
각 단계마다 **검증 명령**(expected output 포함)이 있어, 실패를 즉시 잡을 수 있습니다.

## 이 프로젝트가 뭔가

WordPress 같은 CMS 인데, 상세 페이지를 Figma 처럼 비주얼 편집하면 그대로 게시되는 풀스택 앱입니다.

- **에디터** (`/editor`) — iframe 캔버스, 8방향 리사이즈, 자유 배치, 9분면 정렬, 인라인 텍스트 편집, 자동 정렬 액션, AI 4기능
- **게시 페이지** (`/p/[slug]`) — RSC + ISR, JS 거의 0, Google Fonts 자동 로드
- **`packages/renderer`** — 독립 npm 패키지(`@sketchbook/renderer`). 외부 앱에서도 같은 노드 트리를 렌더 가능

## 사전 요구사항

```bash
node -v          # → v18.17.0 이상 (v20 권장)
npm -v           # → 10 이상
docker --version # → Docker 20 이상 (Postgres 컨테이너용)
git --version
```

전부 통과해야 진행 가능. Node 가 낮으면 `nvm install 20 && nvm use 20`.

## 1. 의존성 설치

```bash
npm install
```

**예상 소요**: 30~90초. 약 600개 패키지 설치.
**허용 가능한 경고**: `2 moderate severity vulnerabilities` (Next 의 transitive dep 으로 무관).
**실패 신호**: `ERR_*`, `peer dependency` 에러.

**검증**:

```bash
test -L node_modules/@sketchbook/renderer && echo "✓ workspace link ok" || echo "✗ workspace link missing"
# → "✓ workspace link ok"

readlink node_modules/@sketchbook/renderer
# → "../../packages/renderer"
```

링크가 없다면 `package.json` 의 `workspaces` 필드 확인 후 `npm install` 재실행.

## 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 의 기본값은 로컬 Postgres 와 매칭되어 있어 그대로 두면 됩니다:

```env
DATABASE_URL="postgresql://sketchbook:sketchbook@localhost:5436/sketchbook"
ANTHROPIC_API_KEY=          # 비워두면 AI 텍스트 기능만 비활성
REPLICATE_API_TOKEN=        # 비워두면 AI 이미지 생성만 비활성
```

AI 키가 없어도 에디터·게시·자동저장·자동 정렬은 모두 동작합니다. AI 버튼만 친절한 에러를 띄움.

**검증**:

```bash
test -f .env && grep -q '^DATABASE_URL=' .env && echo "✓ .env ok"
# → "✓ .env ok"
```

## 3. Postgres 컨테이너 기동

```bash
npm run db:up
```

내부 명령은 `docker compose up -d`. Postgres 16-alpine 이미지가 처음이면 200MB 정도 다운로드.

**검증 (5초 대기 후)**:

```bash
sleep 5 && docker compose ps --format '{{.Name}} {{.Status}}' | grep sketchbook-postgres
# → "sketchbook-postgres Up X seconds (healthy)"
```

`healthy` 가 안 뜨면 `docker compose logs postgres` 확인.

**포트 충돌 시**: `docker-compose.yml` 의 `5436:5432` 와 `.env` 의 `DATABASE_URL` 양쪽을 다른 포트로 변경.

## 4. DB 스키마 적용

```bash
npx prisma migrate deploy
```

기존 마이그레이션을 그대로 적용. 새 마이그레이션 만드는 게 아닙니다.

**예상 출력**:
```
Applying migration `20XXXXXXXXXXXX_init`
The following migration(s) have been applied:
...
All migrations have been successfully applied.
```

**검증**:

```bash
docker exec sketchbook-postgres psql -U sketchbook -d sketchbook -c "\dt" | grep -E '(Page|PageVersion|Site)'
# → "Page", "PageVersion", "Site" 세 줄 모두 출력되어야 함
```

## 5. 시드 데이터 삽입

```bash
npm run db:seed
```

기본 사이트 `main` + 홈 페이지 `home` + 카페 샘플 콘텐츠를 draft 로 넣습니다. **idempotent** — 이미 있으면 건너뜀.

**예상 출력**:
```
✓ site 'main' created: cm...
✓ page 'home' created: cm... draft: cm...
```
또는 (재실행 시):
```
· site 'main' already exists: cm...
· page 'home' already exists: cm...
```

**검증**:

```bash
docker exec sketchbook-postgres psql -U sketchbook -d sketchbook -t -c "SELECT COUNT(*) FROM \"Page\";" | tr -d ' '
# → 1 이상
```

## 6. 패키지 빌드 (외부 배포용 — 선택)

호스트 앱 dev 에서는 `transpilePackages` 로 TS 소스를 직접 사용하므로 이 단계 불필요. 외부 게시·다른 앱에서 사용할 때만:

```bash
npm run build:renderer
```

**검증**:

```bash
ls packages/renderer/dist/ 2>&1
# → index.d.ts  index.js  index.js.map (3개 파일)
```

## 7. 검증 — 빌드 / 테스트 / 타입체크

여기서 멈춰서 모두 통과해야 정상 동작합니다.

```bash
npx tsc --noEmit
# → (출력 없음, exit 0)
```

```bash
npm test
# → "Test Files  2 passed (2)"
# → "Tests  19 passed (19)"
```

```bash
npm run build
# → "Route (app)"  
# → "┌ ○ /"
# → "├ ○ /_not-found"
# → "├ ƒ /demo"
# → "├ ƒ /editor"
# → "└ ○ /p/[slug]"
```

3개 중 하나라도 실패하면 트러블슈팅으로.

## 8. 개발 서버 실행

```bash
npm run dev
```

**예상**:
```
- Local:        http://localhost:3000
✓ Ready in ~200ms
```

3000 이 점유돼 있으면 Next 가 자동으로 다음 포트로(예: 3001).

**검증** — 다른 셸에서:

```bash
curl -s -o /dev/null -w "/      : %{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "/editor: %{http_code}\n" http://localhost:3000/editor
curl -s -o /dev/null -w "/p/home: %{http_code}\n" http://localhost:3000/p/home
```
**예상**:
```
/      : 200
/editor: 200
/p/home: 404
```

`/p/home` 이 **404 인 게 정상** — draft 만 있고 아직 publish 한 적이 없기 때문. 에디터에서 "게시" 버튼 한 번 누르면 200.

게시 후 다시 확인:
```bash
curl -s http://localhost:3000/p/home | grep -oE '(따뜻한 한 잔의 휴식|어딘가|싱글 오리진)' | head -3
# → 카페 페이지 텍스트가 출력되어야 함
```

## 9. 동작 확인 — 핵심 흐름

브라우저로 `http://localhost:3000/editor` 열기. 다음 시퀀스가 모두 동작해야 정상:

1. 캔버스에 카페 페이지가 렌더됨
2. 텍스트 클릭 → 우측 인스펙터에 속성 표시
3. 텍스트 더블클릭 → 인라인 편집 진입 → Enter 로 커밋
4. 툴바에 "저장됨 · HH:MM" 표시 (autosave 동작)
5. 툴바 "게시" 클릭 → "게시 완료" 메시지
6. 툴바 "미리보기" → `/p/home` 새 탭, 변경 내용 반영
7. Cmd+Z 로 마지막 변경 되돌리기
8. Tablet / Mobile 전환 → 캔버스 너비가 줄고 카드가 세로로 쌓임 (media query 동작)

## 헤드리스 사용 — REST API

다른 앱(브라우저·서버·정적 사이트 등)에서 PageDocument JSON 을 그대로 fetch 할 수 있는 공개 API 가 있습니다.
모두 **CORS open**, **ETag + Cache-Control** 적용, 인증 불필요(게시된 콘텐츠는 공개).

### 엔드포인트

| Method | Path | 응답 |
|---|---|---|
| `GET` | `/api/v1/sites/[siteSlug]` | 사이트 메타 + 페이지 수 |
| `GET` | `/api/v1/sites/[siteSlug]/pages?status=PUBLISHED&limit=50&cursor=...` | 페이지 목록 (커서 페이지네이션) |
| `GET` | `/api/v1/sites/[siteSlug]/pages/[pageSlug]` | 게시된 PageDocument JSON |

`status` 옵션: `PUBLISHED` (기본) / `DRAFT` / `ALL`.

### 응답 헤더

- `ETag: "<publishedVersionId>"` — 게시할 때마다 바뀜. 다음 요청에 `If-None-Match` 로 보내면 304.
- `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` — CDN/브라우저가 안전하게 캐시.
- `X-Sketchbook-Schema-Version: 1` — 클라이언트가 마이그레이션 필요 여부 판단용.
- `Access-Control-Allow-Origin: *` — 어디서든 브라우저 fetch 가능.

게시 시점에 서버가 자동으로 `revalidatePath` 호출해 캐시 무효화.

### 검증

```bash
# 1) 사이트 메타
curl -s http://localhost:3000/api/v1/sites/main
# → {"slug":"main","name":"Main Site","pageCount":1,"publishedCount":1,...}

# 2) 페이지 목록
curl -s 'http://localhost:3000/api/v1/sites/main/pages?status=ALL'
# → {"site":{...},"pages":[{"slug":"home",...}],"nextCursor":null}

# 3) PageDocument 본문
curl -s http://localhost:3000/api/v1/sites/main/pages/home | python3 -m json.tool | head -10
# → site / page / document / schemaVersion 키 4개

# 4) ETag 304 동작
ETAG=$(curl -s -I http://localhost:3000/api/v1/sites/main/pages/home | grep -i '^etag:' | awk '{print $2}' | tr -d '\r')
curl -s -o /dev/null -w "%{http_code}\n" -H "If-None-Match: $ETAG" http://localhost:3000/api/v1/sites/main/pages/home
# → 304

# 5) CORS preflight
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS http://localhost:3000/api/v1/sites/main/pages/home \
  -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET"
# → 204
```

### 외부 Next.js 앱에서 사용 — 헤드리스 패턴

```tsx
// 외부 앱: app/blog/[slug]/page.tsx — RSC
import { PageRenderer, type PageDocument } from "@sketchbook/renderer";

const SK_API = "https://your-sketchbook.example.com/api/v1";

async function getDoc(slug: string): Promise<PageDocument | null> {
  const res = await fetch(`${SK_API}/sites/main/pages/${slug}`, {
    next: { revalidate: 60 }, // Next.js 가 자동으로 캐시
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.document;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const doc = await getDoc(params.slug);
  if (!doc) return <div>Not found</div>;
  return <PageRenderer doc={doc} mode="view" />;
}
```

`@sketchbook/renderer` 가 `PageDocument` 타입과 렌더러를 둘 다 제공하므로
**API 응답 그대로 `<PageRenderer>` 에 넘기면 동일한 모양의 페이지가 됩니다.**

### 에러 응답 포맷

```json
{ "error": { "code": "PAGE_NOT_FOUND", "message": "..." } }
```

| code | HTTP | 의미 |
|---|---|---|
| `SITE_NOT_FOUND` | 404 | siteSlug 가 없음 |
| `PAGE_NOT_FOUND` | 404 | pageSlug 가 없음 |
| `NOT_PUBLISHED` | 404 | 페이지는 있으나 publish 안 된 상태 |
| `INVALID_STATUS` | 400 | status 쿼리 파라미터 값 오류 |

## 외부 Next.js 앱에서 `@sketchbook/renderer` 만 쓰기

이 앱이 아니라 다른 Next.js 앱에서 게시 페이지만 렌더하고 싶다면:

```bash
# 1. 패키지 빌드(이 레포에서)
npm run build:renderer

# 2. 타겟 앱에서 — 로컬 링크 (가장 빠름)
cd path/to/target-app
npm install file:/path/to/sketchbook/packages/renderer
```

타겟 앱의 `next.config.ts` 에 transpilePackages 추가:
```ts
const nextConfig = {
  transpilePackages: ["@sketchbook/renderer"],
};
```

타겟 앱에서 사용:
```tsx
import { PageRenderer, type PageDocument } from "@sketchbook/renderer";

export default async function Page() {
  const doc: PageDocument = await fetch("https://your-cms-or-api/page/home")
    .then(r => r.json());
  return <PageRenderer doc={doc} mode="view" />;
}
```

`PageDocument` JSON 은 이 레포의 Postgres 에서 `SELECT document FROM "PageVersion" WHERE id = ...` 로 가져오거나, 자체 API 를 만들어 노출할 수 있습니다. **JSON 그 자체가 호환성의 단위**입니다.

## 트러블슈팅

### `npm install` 의 peer dep 에러
React 19 / Next 16 호환이 필요한 패키지가 있다면 `--legacy-peer-deps` 로 회피. 단 패키지 버전 갱신이 더 안전.

### 워크스페이스 링크가 없음
`package.json` 의 `"workspaces": ["packages/*"]` 와 `dependencies` 에 `"@sketchbook/renderer": "*"` 가 있는지 확인. 둘 다 있으면 `rm -rf node_modules package-lock.json && npm install`.

### Prisma client 미생성
```bash
npx prisma generate
```
Prisma 7+ 이라면 호환 문제 발생 가능 — 이 레포는 Prisma 6 고정.

### Next dev 가 packages/renderer 변경을 못 봄
```bash
rm -rf .next
npm run dev
```
캐시 stale. Turbopack 의 워크스페이스 패키지 감지가 일부 변경에 둔감할 수 있음.

### Turbopack workspace root 경고
상위 디렉터리에 다른 `package-lock.json` 이 있어 Next 가 root 를 잘못 추론. `next.config.ts` 의 `turbopack.root: path.resolve(__dirname)` 이 이미 들어 있음. 그래도 경고가 보이면 무시 가능.

### `/p/home` 게시 후에도 404
```bash
# 1) DB 의 publishedVersionId 확인
docker exec sketchbook-postgres psql -U sketchbook -d sketchbook -c \
  "SELECT id, slug, status, \"publishedVersionId\" FROM \"Page\";"
# publishedVersionId 가 NULL 이면 publish 가 안 된 것 → 에디터에서 "게시" 클릭

# 2) ISR 캐시 stale
rm -rf .next && npm run dev
```

### AI 기능이 "MISSING_API_KEY" 반환
`.env` 에 키 추가 → dev 서버 재시작.

### Postgres 컨테이너가 unhealthy
```bash
docker compose logs postgres | tail -20
docker compose down -v   # 볼륨까지 삭제 → 데이터 손실. 신중히.
docker compose up -d
```

### 포트 3000 점유
Next 가 자동으로 다음 포트 사용 (3001 등). 또는 `PORT=3010 npm run dev` 명시.

## 빠른 명령 cheatsheet

```bash
# 셋업 (한 번)
npm install
cp .env.example .env
npm run db:up
npx prisma migrate deploy
npm run db:seed

# 개발
npm run dev

# 검증
npx tsc --noEmit && npm test && npm run build

# 패키지
npm run build:renderer
cd packages/renderer && npm run publish:dry

# DB 리셋 (데이터 다 날아감)
npm run db:reset && npm run db:seed
```

## 구조 한눈에

```
sketchbook/
├── docker-compose.yml          # Postgres 16 (포트 5436)
├── prisma/
│   ├── schema.prisma           # Site / Page / PageVersion
│   ├── migrations/
│   └── seed.ts                 # idempotent 시드
├── packages/
│   └── renderer/               # @sketchbook/renderer (publishable)
│       ├── src/
│       │   ├── document/       # 타입·Zod·트리·폰트 프리셋
│       │   └── renderer/       # NodeRenderer·PageRenderer·StyleCompiler
│       ├── dist/               # tsup 빌드 산출물 (gitignored)
│       └── package.json
└── src/                         # 호스트 앱
    ├── app/                     # / · /editor · /demo · /p/[slug] · /api/*
    ├── editor/                  # iframe 캔버스 · 인스펙터 · Zustand · auto-layout
    ├── server/                  # actions + AI (Anthropic + Replicate)
    └── lib/                     # Prisma 클라이언트
```

## 환경 정보

- Next.js **16.2.6** (App Router + Turbopack)
- React **19.2.4**
- TypeScript **5**
- Prisma **6.19.3** (Postgres 16)
- Zustand 5 + Immer 11 (에디터 상태)
- @anthropic-ai/sdk + replicate (AI)
- tsup 8 (renderer 패키지 빌드)
- Vitest 4 (테스트)

## 참고 문서

- 패키지 README: [`packages/renderer/README.md`](./packages/renderer/README.md)
- 변경 이력: [`packages/renderer/CHANGELOG.md`](./packages/renderer/CHANGELOG.md)
- 루트 개요: [`README.md`](./README.md)
