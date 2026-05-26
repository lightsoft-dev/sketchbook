# Sketchbook

Figma 처럼 비주얼 편집되고, 편집한 그대로 즉시 게시되는 CMS.

> **코딩 에이전트 / 자동화 셋업**: 단계별 명령 + 검증 절차는 [AGENTS.md](./AGENTS.md) 를 참조하세요. 위에서부터 실행하면 동작하는 환경까지 도달합니다.

- **`apps`(root)** — Next.js 16 + Postgres 기반 풀스택 앱
  - 비주얼 에디터(`/editor`): iframe 캔버스, 8방향 리사이즈, 자유 배치, 9분면 정렬, 인라인 텍스트 편집
  - 게시 페이지(`/p/[slug]`): RSC + ISR, JS 거의 0, 사용된 Google Fonts 만 자동 로드
  - AI 4기능: 카피라이팅 / 이미지 생성(Replicate Flux) / 페이지 생성(Claude Sonnet) / 채팅 편집(PatchOp)
- **`packages/renderer`** — [`@sketchbook/renderer`](./packages/renderer/README.md) 독립 npm 패키지
  - 노드 트리 `PageDocument` 모델 + 유니버설 렌더러
  - 다른 Next.js 앱이 그대로 import 해서 게시 페이지를 렌더할 수 있음
- **헤드리스 REST API** — `/api/v1/sites/[siteSlug]/pages/[pageSlug]` 로 PageDocument JSON 직접 fetch
  - CORS 오픈 + ETag/Cache-Control 적용. 자세한 사용법은 [AGENTS.md → 헤드리스 사용](./AGENTS.md#헤드리스-사용--rest-api)

## 시작하기

```bash
# Postgres 띄우기 (Docker)
npm run db:up

# DB 마이그레이션 + 시드(기본 사이트 + 홈 페이지)
npx prisma migrate dev
npm run db:seed

# 개발 서버
npm run dev
```

브라우저:
- 홈: http://localhost:3000
- 에디터: http://localhost:3000/editor
- 게시 페이지: http://localhost:3000/p/home

## 환경변수 (.env)

`.env.example` 복사 후 채워 넣으세요.

```
DATABASE_URL="postgresql://sketchbook:sketchbook@localhost:5436/sketchbook"
ANTHROPIC_API_KEY=               # 카피 / 페이지 생성 / 채팅 편집
REPLICATE_API_TOKEN=             # AI 이미지 생성 (Flux schnell)
```

## 스택

- Next.js 16 (App Router, RSC + Server Actions)
- React 19
- TypeScript / Zod
- Prisma + Postgres
- Zustand + Immer (에디터 상태 + 패치 기반 undo/redo)
- Tailwind v4 (에디터 UI 만)
- tsup (renderer 패키지 빌드)
- Vitest

## 패키지 빌드 / 게시

```bash
npm run build:renderer          # packages/renderer dist/ 생성
cd packages/renderer
npm run publish:dry             # 패키징 확인
npm run publish:public          # npm 게시 (--access public)
```

자세한 사용·배포 가이드는 [packages/renderer/README.md](./packages/renderer/README.md) 참고.

## 디렉터리

```
.
├── docker-compose.yml          # Postgres 16
├── prisma/                      # 스키마 + 마이그레이션 + 시드
├── packages/
│   └── renderer/               # @sketchbook/renderer (배포 가능)
│       ├── src/
│       │   ├── document/       # 타입·검증·트리·폰트 프리셋
│       │   └── renderer/       # NodeRenderer·PageRenderer·StyleCompiler
│       └── dist/               # 빌드 산출물 (gitignored)
└── src/                         # 호스트 앱(에디터 + DB + AI)
    ├── app/                     # Next 라우트
    ├── editor/                  # iframe 캔버스·인스펙터·상태
    ├── server/                  # actions + AI 서버 호출
    └── lib/                     # Prisma 클라이언트 등
```

## 라이선스

MIT.
