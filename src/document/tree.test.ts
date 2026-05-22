import { describe, expect, it } from "vitest";
import { createSampleDocument } from "./fixtures";
import { validatePageDocument } from "./schema";
import { flatten, getAncestors, getDescendants, hydrate, walk } from "./tree";
import type { TreeNode } from "./types";

describe("flatten / hydrate", () => {
  it("중첩 트리를 플랫 맵으로 변환하고 parentId/children 을 채운다", () => {
    const tree: TreeNode = {
      type: "Frame",
      name: "Root",
      children: [
        { type: "Text", name: "A", props: { text: "a" } },
        {
          type: "Frame",
          name: "Group",
          children: [{ type: "Text", name: "B", props: { text: "b" } }],
        },
      ],
    };
    const { rootId, nodes } = flatten(tree);
    const root = nodes[rootId];
    expect(root.parentId).toBeNull();
    expect(root.children).toHaveLength(2);
    for (const childId of root.children) {
      expect(nodes[childId].parentId).toBe(rootId);
    }
  });

  it("flatten → hydrate 왕복이 구조를 보존한다", () => {
    const doc = createSampleDocument();
    const tree = hydrate(doc.nodes, doc.rootId);
    const { rootId, nodes } = flatten(tree);
    // 노드 개수가 같아야 한다.
    expect(Object.keys(nodes)).toHaveLength(Object.keys(doc.nodes).length);
    expect(nodes[rootId].type).toBe("Frame");
  });

  it("id 가 없으면 새로 부여한다", () => {
    const { nodes } = flatten({ type: "Frame", children: [{ type: "Text", props: { text: "x" } }] });
    for (const id of Object.keys(nodes)) {
      expect(id).toMatch(/^n_/);
    }
  });
});

describe("순회 헬퍼", () => {
  const doc = createSampleDocument();

  it("walk 가 모든 노드를 방문한다", () => {
    let count = 0;
    walk(doc.nodes, doc.rootId, () => count++);
    expect(count).toBe(Object.keys(doc.nodes).length);
  });

  it("getDescendants + 자신 = 전체 노드 수", () => {
    const descendants = getDescendants(doc.nodes, doc.rootId);
    expect(descendants.length + 1).toBe(Object.keys(doc.nodes).length);
  });

  it("getAncestors 가 루트까지의 경로를 반환한다", () => {
    const leaf = Object.values(doc.nodes).find((n) => n.children.length === 0)!;
    const ancestors = getAncestors(doc.nodes, leaf.id);
    expect(ancestors[ancestors.length - 1]).toBe(doc.rootId);
  });
});

describe("schema 검증", () => {
  it("샘플 문서는 검증을 통과한다", () => {
    const doc = createSampleDocument();
    const result = validatePageDocument(doc);
    expect(result.ok).toBe(true);
  });

  it("rootId 가 없는 노드를 가리키면 거부한다", () => {
    const doc = createSampleDocument();
    const broken = { ...doc, rootId: "n_missing" };
    const result = validatePageDocument(broken);
    expect(result.ok).toBe(false);
  });

  it("children 이 존재하지 않는 노드를 가리키면 거부한다", () => {
    const doc = createSampleDocument();
    const firstChildless = Object.values(doc.nodes).find((n) => n.type === "Frame")!;
    const broken = {
      ...doc,
      nodes: {
        ...doc.nodes,
        [firstChildless.id]: { ...firstChildless, children: ["n_ghost"] },
      },
    };
    const result = validatePageDocument(broken);
    expect(result.ok).toBe(false);
  });
});
