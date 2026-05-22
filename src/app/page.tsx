/**
 * 홈 — 임시 랜딩. 에디터/데모 진입점.
 */

import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        fontFamily: "system-ui, sans-serif",
        background: "#fafafa",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, letterSpacing: 2, color: "#999" }}>
          SKETCHBOOK
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "8px 0 4px" }}>
          Figma 처럼 만드는 CMS
        </h1>
        <p style={{ color: "#666", fontSize: 15 }}>
          비주얼로 편집하면 그대로 게시되는 페이지
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/editor"
          style={{
            background: "#1a1a1a",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          에디터 열기
        </Link>
        <Link
          href="/demo"
          style={{
            background: "#fff",
            color: "#1a1a1a",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            border: "1px solid #ddd",
          }}
        >
          게시 페이지 데모
        </Link>
      </div>
    </main>
  );
}
