import { customAlphabet } from "nanoid";

/** URL-safe, 충돌 가능성이 낮은 노드/문서 ID 생성기. */
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 12);

/** 새 노드 ID. 레이아웃 디버깅 편의를 위해 접두사를 붙인다. */
export function newNodeId(): string {
  return `n_${nano()}`;
}

/** 새 문서 ID. */
export function newDocId(): string {
  return `doc_${nano()}`;
}
