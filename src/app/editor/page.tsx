/**
 * 에디터 라우트 — 샘플 문서를 스토어에 적재하고 비주얼 에디터를 띄운다.
 * (DB 연동 전까지 fixture 로 동작. 이후 pageId 로 로드하도록 교체.)
 */

"use client";

import { useRef } from "react";
import { createSampleDocument } from "@/document/fixtures";
import { EditorShell } from "@/editor/EditorShell";
import { useEditorStore } from "@/editor/state/store";

export default function EditorPage() {
  const loaded = useRef(false);
  if (!loaded.current) {
    loaded.current = true;
    useEditorStore.getState().loadDocument(createSampleDocument());
  }
  return <EditorShell />;
}
