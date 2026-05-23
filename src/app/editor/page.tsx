/**
 * 에디터 라우트 — RSC: DB 에서 페이지 번들을 가져와 EditorClient 에 넘긴다.
 */

import Link from "next/link";
import { getEditorPage } from "@/server/actions/page-actions";
import { EditorClient } from "./EditorClient";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const bundle = await getEditorPage();
  if (!bundle) {
    return (
      <main style={{ padding: 48, fontFamily: "system-ui, sans-serif" }}>
        <h1>페이지가 없습니다</h1>
        <p style={{ color: "#666" }}>
          시드를 먼저 실행하세요: <code>npm run db:seed</code>
        </p>
        <Link href="/">홈으로</Link>
      </main>
    );
  }
  return <EditorClient bundle={bundle} />;
}
