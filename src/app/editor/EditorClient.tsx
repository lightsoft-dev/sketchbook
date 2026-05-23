/**
 * EditorClient — DB 에서 받은 초기 페이지 번들을 스토어에 적재하고
 * 변경 시 디바운스 autosave 를 트리거한다. EditorShell 을 마운트한다.
 */

"use client";

import { useEffect, useRef } from "react";
import { EditorShell } from "@/editor/EditorShell";
import { useEditorStore } from "@/editor/state/store";
import { savePageDraft } from "@/server/actions/page-actions";
import type { EditorPageBundle } from "@/server/actions/page-actions";

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function EditorClient({ bundle }: { bundle: EditorPageBundle }) {
  const loaded = useRef(false);
  if (!loaded.current) {
    loaded.current = true;
    useEditorStore.getState().loadDocument(bundle.doc, bundle.pageId);
  }

  // doc 가 바뀌고 dirty 인 동안 디바운스 후 서버에 저장.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastSavedDoc = useEditorStore.getState().doc;

    const schedule = () => {
      const state = useEditorStore.getState();
      if (!state.dirty || !state.pageId) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const cur = useEditorStore.getState();
        if (!cur.dirty || !cur.pageId) return;
        if (cur.doc === lastSavedDoc) return;
        useEditorStore.getState().setSaveState("saving");
        const docSnapshot = cur.doc;
        const result = await savePageDraft(cur.pageId, docSnapshot);
        const after = useEditorStore.getState();
        if (result.ok) {
          // 저장 후에도 추가 편집이 없다면 dirty 해제.
          lastSavedDoc = docSnapshot;
          if (after.doc === docSnapshot) {
            useEditorStore.setState({ dirty: false });
          }
          useEditorStore.getState().setSaveState("saved", { savedAt: result.savedAt });
        } else {
          useEditorStore
            .getState()
            .setSaveState("error", { error: result.error });
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useEditorStore.subscribe((s, prev) => {
      if (s.doc !== prev.doc && s.dirty) schedule();
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return <EditorShell />;
}
