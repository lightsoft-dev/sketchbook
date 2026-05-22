/**
 * 트리 ↔ 플랫 맵 변환 + 노드 트리 순회 헬퍼.
 *
 * 정본은 플랫 맵(`PageDocument.nodes`)이지만, AI 입출력처럼 다루기 쉬운
 * 중첩 트리(`TreeNode`)가 필요한 곳을 위해 양방향 변환을 제공한다.
 */

import { createNode } from "./defaults";
import { newNodeId } from "./ids";
import type { Node, NodeId, PageDocument, TreeNode } from "./types";

// ─────────────────────────────────────────────────────────────
// 트리 → 플랫 맵
// ─────────────────────────────────────────────────────────────

export interface FlattenResult {
  rootId: NodeId;
  nodes: Record<NodeId, Node>;
}

/**
 * 중첩 TreeNode 를 플랫 노드 맵으로 변환한다.
 * id 가 없으면 새로 부여하고, parentId/children 을 채운다.
 * 각 노드는 `createNode` 로 기본값을 채운 뒤 트리에서 온 값으로 덮어쓴다 → 부분 입력도 안전.
 */
export function flatten(tree: TreeNode): FlattenResult {
  const nodes: Record<NodeId, Node> = {};

  function visit(treeNode: TreeNode, parentId: NodeId | null): NodeId {
    const id = treeNode.id ?? newNodeId();
    // 기본값 베이스 생성 후 트리 입력값을 병합.
    const node = createNode(treeNode.type, {
      id,
      name: treeNode.name,
      parentId,
      props: treeNode.props,
    });
    if (treeNode.style?.base) node.style.base = { ...node.style.base, ...treeNode.style.base };
    if (treeNode.style?.tablet) node.style.tablet = treeNode.style.tablet;
    if (treeNode.style?.mobile) node.style.mobile = treeNode.style.mobile;
    if (treeNode.layoutMode) node.layoutMode = treeNode.layoutMode;
    if (treeNode.hidden) node.hidden = treeNode.hidden;
    if (treeNode.locked) node.locked = treeNode.locked;

    const childIds: NodeId[] = [];
    if (treeNode.type === "Frame" && treeNode.children) {
      for (const child of treeNode.children) {
        childIds.push(visit(child, id));
      }
    }
    node.children = childIds as Node["children"];
    nodes[id] = node;
    return id;
  }

  const rootId = visit(tree, null);
  return { rootId, nodes };
}

// ─────────────────────────────────────────────────────────────
// 플랫 맵 → 트리
// ─────────────────────────────────────────────────────────────

/** 플랫 맵을 중첩 TreeNode 로 재구성한다. */
export function hydrate(nodes: Record<NodeId, Node>, rootId: NodeId): TreeNode {
  function build(id: NodeId): TreeNode {
    const node = nodes[id];
    if (!node) throw new Error(`hydrate: 노드를 찾을 수 없음 — ${id}`);
    const tree: TreeNode = {
      id: node.id,
      type: node.type,
      name: node.name,
      style: node.style,
      props: node.props,
    };
    if (node.layoutMode) tree.layoutMode = node.layoutMode;
    if (node.hidden) tree.hidden = node.hidden;
    if (node.locked) tree.locked = node.locked;
    if (node.children.length > 0) {
      tree.children = node.children.map(build);
    }
    return tree;
  }
  return build(rootId);
}

// ─────────────────────────────────────────────────────────────
// 순회 헬퍼
// ─────────────────────────────────────────────────────────────

/** rootId 부터 깊이 우선으로 모든 노드를 방문한다. */
export function walk(
  nodes: Record<NodeId, Node>,
  rootId: NodeId,
  fn: (node: Node, depth: number) => void,
): void {
  function visit(id: NodeId, depth: number) {
    const node = nodes[id];
    if (!node) return;
    fn(node, depth);
    for (const childId of node.children) visit(childId, depth + 1);
  }
  visit(rootId, 0);
}

/** 한 노드의 조상 id 목록(가까운 부모 → 루트 순). */
export function getAncestors(nodes: Record<NodeId, Node>, id: NodeId): NodeId[] {
  const result: NodeId[] = [];
  let current = nodes[id]?.parentId ?? null;
  while (current) {
    result.push(current);
    current = nodes[current]?.parentId ?? null;
  }
  return result;
}

/** 한 노드의 모든 후손 id 목록(자신 제외). */
export function getDescendants(nodes: Record<NodeId, Node>, id: NodeId): NodeId[] {
  const result: NodeId[] = [];
  const node = nodes[id];
  if (!node) return result;
  for (const childId of node.children) {
    result.push(childId);
    result.push(...getDescendants(nodes, childId));
  }
  return result;
}

/** descendantId 가 ancestorId 의 후손인지(자기 자신 포함하지 않음). */
export function isDescendantOf(
  nodes: Record<NodeId, Node>,
  descendantId: NodeId,
  ancestorId: NodeId,
): boolean {
  return getAncestors(nodes, descendantId).includes(ancestorId);
}

/**
 * 문서에서 도달 불가능한(고아) 노드를 제거해 정합성을 맞춘다.
 * AI 출력이나 패치 적용 후 호출하면 안전하다.
 */
export function pruneOrphans(doc: PageDocument): PageDocument {
  const reachable = new Set<NodeId>([doc.rootId]);
  walk(doc.nodes, doc.rootId, (node) => reachable.add(node.id));
  const nodes: Record<NodeId, Node> = {};
  for (const id of reachable) {
    if (doc.nodes[id]) nodes[id] = doc.nodes[id];
  }
  return { ...doc, nodes };
}
