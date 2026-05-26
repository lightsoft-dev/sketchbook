# Changelog

이 패키지의 모든 주목할 만한 변경은 이 파일에 기록됩니다.
포맷은 [Keep a Changelog](https://keepachangelog.com/) 를 따릅니다.

## [Unreleased]

## [0.1.0] - 2026-05

### Added
- 노드 트리 `PageDocument` 모델 (정규화된 flat map, 닫힌 노드 타입 집합).
- 유니버설 렌더러 — `PageRenderer` / `NodeRenderer` (RSC·client 양쪽 동작).
- `StyleCompiler` — `ResponsiveStyle` → 결정적 클래스명 + media query CSS.
- `flatten` / `hydrate` — TreeNode ↔ 정규화된 노드 맵 변환.
- Zod 기반 검증 + 참조 무결성 확인.
- 시스템 + Google Fonts 프리셋 + `getGoogleFontsUrl()` 자동 로드.
- 스타일 마이그레이션 시스템 (`schemaVersion` + `migrate()`).
