/**
 * 사용자 콘텐츠 영역의 최소 리셋 — 에디터 UI 스타일과 무관하게 일관된 기준선.
 * 게시 페이지와 에디터 캔버스가 공유한다.
 */
export const SK_RESET = `
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
[data-node-id]{box-sizing:border-box;margin:0;}
[data-node-id] img{display:block;max-width:100%;}
button[data-node-id]{border:0;cursor:pointer;font:inherit;}
a[data-node-id]{text-decoration:none;}
`;
