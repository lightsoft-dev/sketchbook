/**
 * 에디터 상태 스토어 (Zustand).
 *
 * - `doc` 는 히스토리 대상. 변경은 모두 `commit(mutator)` 단일 경로를 거친다.
 * - 선택/호버/breakpoint 같은 UI 상태는 히스토리 비대상.
 * - 히스토리는 Immer 의 patch/inverse-patch 기반 → 작고 정확한 undo/redo.
 */

"use client";

import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import { create } from "zustand";
import type { BreakpointId, Node, NodeId, PageDocument } from "@/document/types";
import { createNode, type CreateNodeOptions } from "@/document/defaults";
import { newNodeId } from "@/document/ids";
import { getDescendants } from "@/document/tree";
import type { NodeType } from "@/document/types";
import {
  cmdDeleteNode,
  cmdInsertNode,
  cmdMoveNode,
  cmdRename,
  cmdReorderChild,
  cmdSetHidden,
  cmdSetLayoutMode,
  cmdUpdateProps,
  cmdUpdateStyle,
  type Mutator,
} from "./commands";

enablePatches();

interface HistoryEntry {
  forward: Patch[];
  inverse: Patch[];
  /** 같은 키의 연속 변경은 한 엔트리로 병합(coalesce)된다. */
  coalesceKey?: string;
}

interface CommitOptions {
  /** 슬라이더 드래그 등 연속 변경을 하나의 undo 단위로 묶는 키. */
  coalesceKey?: string;
}

export interface EditorState {
  // ── 문서 (히스토리 대상) ──
  doc: PageDocument;

  // ── UI 상태 (히스토리 비대상) ──
  selectedIds: NodeId[];
  hoveredId: NodeId | null;
  activeBreakpoint: BreakpointId;
  /** 인라인 편집 중인 텍스트 노드 id. */
  editingTextId: NodeId | null;
  /** 더티 플래그 — autosave 트리거용. */
  dirty: boolean;

  // ── 페이지 식별/저장 상태 ──
  pageId: string | null;
  saveState: "idle" | "saving" | "saved" | "error";
  lastSavedAt: string | null;
  saveError: string | null;

  // ── 히스토리 ──
  past: HistoryEntry[];
  future: HistoryEntry[];

  // ── 내부 ──
  commit: (mutator: Mutator, opts?: CommitOptions) => void;

  // ── 문서 변경 액션 ──
  insertNode: (type: NodeType, parentId: NodeId, index?: number) => NodeId | null;
  deleteNode: (nodeId: NodeId) => void;
  duplicateNode: (nodeId: NodeId) => NodeId | null;
  moveNode: (nodeId: NodeId, newParentId: NodeId, index: number) => void;
  reorderChild: (parentId: NodeId, from: number, to: number) => void;
  updateStyle: (
    nodeId: NodeId,
    patch: Record<string, unknown>,
    opts?: CommitOptions,
  ) => void;
  updateProps: (nodeId: NodeId, patch: Record<string, unknown>) => void;
  rename: (nodeId: NodeId, name: string) => void;
  setLayoutMode: (nodeId: NodeId, mode: "flow" | "absolute") => void;
  setHidden: (nodeId: NodeId, breakpoint: BreakpointId, hidden: boolean) => void;

  // ── 히스토리 액션 ──
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ── UI 액션 ──
  select: (nodeId: NodeId | null) => void;
  setHovered: (nodeId: NodeId | null) => void;
  setBreakpoint: (bp: BreakpointId) => void;
  setEditingText: (nodeId: NodeId | null) => void;
  loadDocument: (doc: PageDocument, pageId?: string | null) => void;
  setSaveState: (state: "idle" | "saving" | "saved" | "error", info?: { savedAt?: string; error?: string }) => void;
  markSaved: () => void;
}

/** 선택 목록에서 더 이상 존재하지 않는 노드를 제거한다. */
function pruneSelection(ids: NodeId[], doc: PageDocument): NodeId[] {
  return ids.filter((id) => doc.nodes[id]);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: {
    schemaVersion: 1,
    id: "doc_empty",
    rootId: "n_root",
    nodes: {
      n_root: createNode("Frame", { id: "n_root", name: "Page" }),
    },
    meta: { title: "", slug: "" },
  },
  selectedIds: [],
  hoveredId: null,
  activeBreakpoint: "base",
  editingTextId: null,
  dirty: false,
  pageId: null,
  saveState: "idle",
  lastSavedAt: null,
  saveError: null,
  past: [],
  future: [],

  commit: (mutator, opts) => {
    const { doc, past } = get();
    const [next, forward, inverse] = produceWithPatches(doc, mutator);
    if (forward.length === 0) return; // 실질 변경 없음

    let nextPast: HistoryEntry[];
    const last = past[past.length - 1];
    if (opts?.coalesceKey && last && last.coalesceKey === opts.coalesceKey) {
      // 직전 엔트리와 병합: forward 는 이어 붙이고, inverse 는 역순으로 앞에 붙인다.
      nextPast = [
        ...past.slice(0, -1),
        {
          forward: [...last.forward, ...forward],
          inverse: [...inverse, ...last.inverse],
          coalesceKey: opts.coalesceKey,
        },
      ];
    } else {
      nextPast = [...past, { forward, inverse, coalesceKey: opts?.coalesceKey }];
    }
    set({ doc: next, past: nextPast, future: [], dirty: true });
  },

  insertNode: (type, parentId, index) => {
    const opts: CreateNodeOptions = { parentId };
    const node = createNode(type, opts);
    get().commit(cmdInsertNode(parentId, node as Node, {}, index));
    set({ selectedIds: [node.id] });
    return node.id;
  },

  deleteNode: (nodeId) => {
    get().commit(cmdDeleteNode(nodeId));
    set((s) => ({ selectedIds: pruneSelection(s.selectedIds, s.doc) }));
  },

  duplicateNode: (nodeId) => {
    const { doc } = get();
    const original = doc.nodes[nodeId];
    if (!original || nodeId === doc.rootId || !original.parentId) return null;

    // 노드 + 후손 전체를 새 id 로 복제.
    const idMap: Record<NodeId, NodeId> = { [nodeId]: newNodeId() };
    for (const id of getDescendants(doc.nodes, nodeId)) idMap[id] = newNodeId();

    const cloneOne = (id: NodeId, parentNewId: NodeId | null): Node => {
      const src = doc.nodes[id];
      const newId = idMap[id];
      const clone: Node = JSON.parse(JSON.stringify(src));
      clone.id = newId;
      clone.parentId = parentNewId;
      clone.children = src.children.map((cid) => idMap[cid]) as Node["children"];
      return clone;
    };
    const newRoot = cloneOne(nodeId, original.parentId);
    const descendantClones: Record<NodeId, Node> = {};
    for (const did of getDescendants(doc.nodes, nodeId)) {
      const newParentId = idMap[doc.nodes[did].parentId as NodeId];
      descendantClones[idMap[did]] = cloneOne(did, newParentId);
    }
    // 원본 다음 인덱스에 삽입.
    const parent = doc.nodes[original.parentId];
    if (parent.type !== "Frame") return null;
    const idx = parent.children.indexOf(nodeId) + 1;
    get().commit(cmdInsertNode(original.parentId, newRoot, descendantClones, idx));
    set({ selectedIds: [newRoot.id] });
    return newRoot.id;
  },

  moveNode: (nodeId, newParentId, index) => {
    get().commit(cmdMoveNode(nodeId, newParentId, index));
  },

  reorderChild: (parentId, from, to) => {
    get().commit(cmdReorderChild(parentId, from, to));
  },

  updateStyle: (nodeId, patch, opts) => {
    const bp = get().activeBreakpoint;
    get().commit(cmdUpdateStyle(nodeId, bp, patch), opts);
  },

  updateProps: (nodeId, patch) => {
    get().commit(cmdUpdateProps(nodeId, patch));
  },

  rename: (nodeId, name) => {
    get().commit(cmdRename(nodeId, name));
  },

  setLayoutMode: (nodeId, mode) => {
    get().commit(cmdSetLayoutMode(nodeId, mode));
  },

  setHidden: (nodeId, breakpoint, hidden) => {
    get().commit(cmdSetHidden(nodeId, breakpoint, hidden));
  },

  undo: () => {
    const { doc, past, future } = get();
    const entry = past[past.length - 1];
    if (!entry) return;
    const next = applyPatches(doc, entry.inverse) as PageDocument;
    set((s) => ({
      doc: next,
      past: past.slice(0, -1),
      future: [entry, ...future],
      selectedIds: pruneSelection(s.selectedIds, next),
      dirty: true,
    }));
  },

  redo: () => {
    const { doc, past, future } = get();
    const entry = future[0];
    if (!entry) return;
    const next = applyPatches(doc, entry.forward) as PageDocument;
    set((s) => ({
      doc: next,
      past: [...past, entry],
      future: future.slice(1),
      selectedIds: pruneSelection(s.selectedIds, next),
      dirty: true,
    }));
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  select: (nodeId) => {
    set({ selectedIds: nodeId ? [nodeId] : [] });
  },

  setHovered: (nodeId) => {
    if (get().hoveredId !== nodeId) set({ hoveredId: nodeId });
  },

  setBreakpoint: (bp) => {
    set({ activeBreakpoint: bp });
  },

  setEditingText: (nodeId) => {
    set({ editingTextId: nodeId });
  },

  loadDocument: (doc, pageId) => {
    set({
      doc,
      pageId: pageId ?? null,
      selectedIds: [],
      hoveredId: null,
      editingTextId: null,
      past: [],
      future: [],
      dirty: false,
      saveState: "idle",
      saveError: null,
    });
  },

  setSaveState: (state, info) =>
    set({
      saveState: state,
      lastSavedAt: info?.savedAt ?? (state === "saved" ? new Date().toISOString() : undefined),
      saveError: info?.error ?? null,
    }),

  markSaved: () => set({ dirty: false }),
}));
