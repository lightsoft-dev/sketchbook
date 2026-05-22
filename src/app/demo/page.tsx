/**
 * 데모 라우트 — 샘플 문서를 유니버설 렌더러로 게시 모드 렌더링한다.
 * DB 연결 전까지 렌더러를 즉시 확인하는 용도.
 */

import { createSampleDocument } from "@/document/fixtures";
import { PageRenderer } from "@/renderer/PageRenderer";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  const doc = createSampleDocument();
  return <PageRenderer doc={doc} mode="view" />;
}
