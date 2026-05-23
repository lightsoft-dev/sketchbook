/**
 * 캔버스 iframe document 의 모듈 레벨 참조.
 * 에디터는 단일 캔버스 가정 → 인스펙터 등 DOM 측정이 필요한 곳이 직접 조회한다.
 */

let _canvasDoc: Document | null = null;

export function setCanvasDoc(d: Document | null) {
  _canvasDoc = d;
}

export function getCanvasDoc(): Document | null {
  return _canvasDoc;
}

/** 노드 id 로 캔버스 안의 DOM 요소를 찾는다. */
export function findNodeEl(id: string): HTMLElement | null {
  const d = _canvasDoc;
  if (!d) return null;
  return d.querySelector<HTMLElement>(`[data-node-id="${cssEscape(id)}"]`);
}

export function cssEscape(s: string): string {
  return s.replace(/"/g, '\\"');
}
