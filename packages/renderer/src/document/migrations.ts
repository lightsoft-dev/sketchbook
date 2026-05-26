/**
 * 스키마 마이그레이션 — 비주얼 에디터의 문서 모델은 반드시 진화하므로
 * 1일차부터 버전 게이트를 둔다.
 *
 * 새 버전을 도입할 때: CURRENT_SCHEMA_VERSION 을 올리고 `migrations` 에
 * `{ from: N, to: N+1, apply }` 를 추가한다.
 */

import { CURRENT_SCHEMA_VERSION, type PageDocument } from "./types";

interface Migration {
  from: number;
  to: number;
  apply: (doc: PageDocument) => PageDocument;
}

/** 버전 오름차순 마이그레이션 목록. (아직 비어 있음 — schemaVersion 1 이 최신.) */
const migrations: Migration[] = [];

/**
 * 문서를 최신 스키마 버전으로 끌어올린다.
 * 이미 최신이면 그대로 반환한다.
 */
export function migrate(doc: PageDocument): PageDocument {
  let current = doc;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = migrations.find((m) => m.from === current.schemaVersion);
    if (!step) {
      throw new Error(
        `스키마 v${current.schemaVersion} → v${CURRENT_SCHEMA_VERSION} 마이그레이션 경로 없음`,
      );
    }
    current = { ...step.apply(current), schemaVersion: step.to };
  }
  return current;
}

/** 문서가 더 최신 버전(이 빌드가 모르는 미래 버전)인지 확인한다. */
export function isFutureVersion(doc: PageDocument): boolean {
  return doc.schemaVersion > CURRENT_SCHEMA_VERSION;
}
