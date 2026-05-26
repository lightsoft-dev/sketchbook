/**
 * 채팅 기반 페이지 편집.
 *
 * 사용자 지시 + 현재 문서 요약 + 선택 노드 상세를 Claude 에 보내고
 * 도구 `apply_edits` 를 통해 PatchOp 배열을 받는다.
 * 클라이언트는 받은 op 들을 단일 Command 로 묶어 적용해 한 번의 undo 단위가 된다.
 */

"use server";

import "server-only";
import { z } from "zod";
import type { PageDocument } from "@sketchbook/renderer";
import { walk } from "@sketchbook/renderer";
import { extractText, getAnthropic, MissingApiKeyError, MODELS } from "./client";

// ── 클라이언트와 공유되는 PatchOp 타입 ──
export type ChatPatchOp =
  | {
      op: "setStyle";
      nodeId: string;
      breakpoint?: "base" | "tablet" | "mobile";
      style: Record<string, unknown>;
    }
  | {
      op: "setProps";
      nodeId: string;
      props: Record<string, unknown>;
    }
  | {
      op: "removeNode";
      nodeId: string;
    }
  | {
      op: "insertNode";
      parentId: string;
      index?: number;
      // 중첩 TreeNode (서버에서 flatten 한 후 client 가 받아 적용).
      node: unknown;
    };

export type ChatEditResult =
  | { ok: true; ops: ChatPatchOp[]; message: string }
  | { ok: false; error: string; code?: "MISSING_API_KEY" };

const inputSchema = z.object({
  doc: z.any(),
  selectedNodeId: z.string().nullable(),
  instruction: z.string().min(1).max(2000),
});

const SYSTEM_PROMPT = `당신은 Sketchbook 비주얼 CMS 의 편집 어시스턴트입니다.
사용자가 자연어로 지시한 변경을 노드 트리에 적용할 패치(PatchOp 배열)로 출력합니다.

## 사용 가능한 노드 타입과 props

- Frame: 컨테이너. props: { as?: "div"|"section"|"header"|"footer"|"nav"|"main"|"article" }
- Text:  텍스트. props: { text: string, as?: "h1"|"h2"|"h3"|"h4"|"p"|"span" }
- Image: 이미지. props: { src?: string, alt: string }
- Button: 버튼. props: { label: string, href?: string, target?: "_self"|"_blank" }

## StyleProps (CSS 부분집합)

레이아웃: display, flexDirection, flexWrap, justifyContent, alignItems, gap
크기: width, height, minWidth, minHeight, maxWidth, maxHeight (number=px 또는 "100%"/"auto")
박스: padding/margin/borderRadius/borderWidth ({top,right,bottom,left})
외형: background ({type:"solid",color:"#hex"} 또는 {type:"gradient",css:"..."}), opacity, boxShadow
타이포: color, fontFamily, fontSize, fontWeight, lineHeight, textAlign, letterSpacing
이미지: objectFit ("cover"|"contain"|"fill")

자유 배치: position, top, right, bottom, left, zIndex

## 패치 연산

PatchOp 종류(op 필드로 구분):
1. setStyle: 노드 스타일을 부분 갱신. breakpoint 미지정 시 "base".
   { op: "setStyle", nodeId, breakpoint?, style: { ... } }
2. setProps: 노드 props 부분 갱신. text/label/href/src 등 변경에 사용.
   { op: "setProps", nodeId, props: { ... } }
3. removeNode: 노드 + 후손 제거.
   { op: "removeNode", nodeId }
4. insertNode: parentId 의 children[index] 위치에 새 노드 삽입(index 생략 시 끝).
   { op: "insertNode", parentId, index?, node: TreeNode }
   node 는 { type, name?, props?, style?, children? } 형식.

## 규칙

- 사용자 지시를 가장 작은 변경의 모음으로 표현하세요(전체 재생성 금지).
- 사용자가 "이"/"여기" 같이 지시하면 선택된 노드를 기준으로 해석합니다.
- 값이 명확하지 않으면 합리적 기본값을 추정하되 보수적으로(과한 변경 피함).
- 도구 \`apply_edits\` 를 반드시 호출하세요. message 에는 무엇을 했는지 짧게 한국어로 설명합니다.

## 출력 형식

apply_edits.input = {
  ops: PatchOp[],
  message: "[적용 내용 한 줄 한국어 설명]"
}`;

const applyEditsTool = {
  name: "apply_edits",
  description: "사용자 지시를 반영할 PatchOp 배열을 적용하고 짧은 설명을 반환합니다.",
  input_schema: {
    type: "object" as const,
    properties: {
      ops: {
        type: "array" as const,
        description: "적용할 PatchOp 배열",
        items: { type: "object" as const },
      },
      message: { type: "string" as const, description: "적용 내용 한국어 설명" },
    },
    required: ["ops", "message"],
  },
};

/** 한 줄에 한 노드: 깊이 들여쓰기 + id + type + name + 선택 표시. */
function summarizeDoc(doc: PageDocument, selectedId: string | null): string {
  const lines: string[] = [];
  walk(doc.nodes, doc.rootId, (node, depth) => {
    const indent = "  ".repeat(depth);
    const sel = node.id === selectedId ? "  ← 선택됨" : "";
    lines.push(`${indent}- ${node.id} [${node.type}] "${node.name}"${sel}`);
  });
  return lines.join("\n");
}

export async function aiChatEdit(
  doc: PageDocument,
  selectedNodeId: string | null,
  instruction: string,
): Promise<ChatEditResult> {
  const parsed = inputSchema.safeParse({ doc, selectedNodeId, instruction });
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력" };

  try {
    const client = getAnthropic();

    const summary = summarizeDoc(doc, selectedNodeId);
    let selectedDetail = "";
    if (selectedNodeId && doc.nodes[selectedNodeId]) {
      const sel = doc.nodes[selectedNodeId];
      selectedDetail = `\n\n## 선택된 노드 상세\n\`\`\`json\n${JSON.stringify(
        {
          id: sel.id,
          type: sel.type,
          name: sel.name,
          props: sel.props,
          style: sel.style,
          layoutMode: sel.layoutMode,
        },
        null,
        2,
      )}\n\`\`\``;
    }

    const userMsg = `## 현재 페이지 구조\n\`\`\`\n${summary}\n\`\`\`${selectedDetail}\n\n## 사용자 지시\n${instruction}`;

    const response = await client.messages.create({
      model: MODELS.smart,
      max_tokens: 4000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [applyEditsTool],
      tool_choice: { type: "tool", name: "apply_edits" },
      messages: [{ role: "user", content: userMsg }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: `AI 가 패치를 반환하지 않았습니다: ${extractText(response).slice(0, 200)}`,
      };
    }

    const args = toolUse.input as { ops?: ChatPatchOp[]; message?: string };
    const ops = Array.isArray(args?.ops) ? args.ops : [];
    const message = args?.message ?? "";

    // 서버 측 1차 검증: 알려진 op 타입만, nodeId 존재 확인.
    const validOps: ChatPatchOp[] = [];
    for (const op of ops) {
      if (!op || typeof op !== "object" || !("op" in op)) continue;
      switch (op.op) {
        case "setStyle":
          if (typeof op.nodeId === "string" && op.style && doc.nodes[op.nodeId]) {
            validOps.push(op);
          }
          break;
        case "setProps":
          if (typeof op.nodeId === "string" && op.props && doc.nodes[op.nodeId]) {
            validOps.push(op);
          }
          break;
        case "removeNode":
          if (
            typeof op.nodeId === "string" &&
            doc.nodes[op.nodeId] &&
            op.nodeId !== doc.rootId
          ) {
            validOps.push(op);
          }
          break;
        case "insertNode":
          if (
            typeof op.parentId === "string" &&
            doc.nodes[op.parentId] &&
            op.node
          ) {
            validOps.push(op);
          }
          break;
      }
    }

    if (validOps.length === 0) {
      return {
        ok: false,
        error: `유효한 패치가 없습니다: ${message || "(설명 없음)"}`,
      };
    }

    return { ok: true, ops: validOps, message: message || `${validOps.length}개 변경 적용` };
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return { ok: false, error: err.message, code: "MISSING_API_KEY" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `채팅 편집 실패: ${msg}` };
  }
}
