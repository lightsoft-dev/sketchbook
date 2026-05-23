/**
 * AI 페이지 생성 — 자연어 프롬프트에서 노드 트리를 생성한다.
 *
 * Claude Sonnet + tool use 로 구조화 출력을 강제한다.
 * 결과 트리를 서버에서 flatten → Zod 검증 → 현재 페이지의 draft 로 저장한다.
 *
 * 신뢰 경계: 모델 출력은 무조건 Zod 로 재검증한다.
 */

"use server";

import "server-only";
import { z } from "zod";
import { CURRENT_SCHEMA_VERSION, type PageDocument, type TreeNode } from "@/document/types";
import { flatten } from "@/document/tree";
import { newDocId } from "@/document/ids";
import { validatePageDocument } from "@/document/schema";
import { prisma } from "@/lib/db";
import { extractText, getAnthropic, MissingApiKeyError, MODELS } from "./client";

const inputSchema = z.object({
  pageId: z.string(),
  prompt: z.string().min(3).max(2000),
});

export type GeneratePageResult =
  | { ok: true; doc: PageDocument }
  | { ok: false; error: string; code?: "MISSING_API_KEY" };

const SYSTEM_PROMPT = `당신은 웹 페이지를 노드 트리(JSON) 로 디자인하는 비주얼 빌더입니다.
사용자의 요청을 받아 그에 맞는 페이지 구조를 생성합니다. 한국어 웹사이트가 기본입니다.

## 노드 트리 스키마

페이지는 최상위 Frame 1개를 루트로 하는 트리입니다. 노드 타입은 4가지:
- "Frame": 컨테이너. flex 기반 오토레이아웃. 자식을 가질 수 있다.
- "Text": 텍스트. props.text(필수), props.as("h1"|"h2"|"h3"|"h4"|"p"|"span").
- "Image": 이미지. props.src(없으면 자리표시자), props.alt(필수).
- "Button": 버튼. props.label(필수), props.href, props.target.

각 노드: { type, name?, props?, style?, children? }
- name: 레이어 패널 표시명(짧고 의미 있게).
- children: Frame 만 사용. 다른 타입에는 넣지 마세요.
- style: { base: StyleProps, tablet?: StyleProps, mobile?: StyleProps }

## StyleProps (CSS 부분집합)

레이아웃:
- display: "flex"|"block"|"grid"|"none"
- flexDirection: "row"|"column"
- gap: number(px) 또는 "1rem"
- justifyContent / alignItems: "flex-start"|"center"|"flex-end"|"space-between"|"stretch"
- padding / margin: { top, right, bottom, left } (각각 px 숫자)

크기/위치:
- width / height / maxWidth: number(px) 또는 "100%" / "auto"

외형:
- background: { type: "solid", color: "#hex" } 또는 { type: "gradient", css: "linear-gradient(...)" }
- color (텍스트 색): "#hex"
- borderRadius: { top, right, bottom, left } (모서리)
- boxShadow: [{ x, y, blur, spread, color }]

타이포 (Text/Button):
- fontSize: number(px)
- fontWeight: 400 ~ 800
- lineHeight: 숫자(1.5 등, 단위 없음)
- textAlign: "left"|"center"|"right"
- letterSpacing: 숫자(px) 음수 가능

## 좋은 페이지 패턴

- 루트 Frame: flexDirection: "column", width: "100%", background, fontFamily 지정.
- 섹션은 각각 Frame: padding 큼 (예: 80px), maxWidth: 1100 + alignSelf: "center" 로 가운데.
- Hero: 큰 fontSize(40~64), 강한 색 대비, gap 으로 여백.
- Card 그룹: flexDirection: "row" + gap, 모바일 override 로 column.
- 모바일 반응형: 폰트 크기 축소, padding 축소, row→column.

## 응답 규칙

submit_page 도구를 반드시 호출하세요. arguments:
- title: 페이지 제목(한국어, 30자 이내)
- tree: 루트 Frame 노드(JSON)

설명·인사·코드블록 출력 금지. 도구 호출만.`;

const submitPageTool = {
  name: "submit_page",
  description: "생성한 페이지의 제목과 노드 트리를 제출합니다.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" as const, description: "페이지 제목" },
      tree: {
        type: "object" as const,
        description: "루트 Frame 노드(자식 포함 전체 트리)",
      },
    },
    required: ["title", "tree"],
  },
};

export async function aiGeneratePage(
  pageId: string,
  prompt: string,
): Promise<GeneratePageResult> {
  const parsed = inputSchema.safeParse({ pageId, prompt });
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력" };

  try {
    const client = getAnthropic();

    const response = await client.messages.create({
      model: MODELS.smart,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [submitPageTool],
      tool_choice: { type: "tool", name: "submit_page" },
      messages: [
        {
          role: "user",
          content: `다음 요청에 맞는 페이지를 만들어 주세요:\n\n${prompt}`,
        },
      ],
    });

    // tool_use 블록에서 input 추출.
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        ok: false,
        error: `AI 가 도구를 호출하지 않았습니다: ${extractText(response).slice(0, 200)}`,
      };
    }
    const args = toolUse.input as { title: string; tree: TreeNode };
    if (!args?.tree || typeof args.tree !== "object") {
      return { ok: false, error: "AI 가 트리를 반환하지 않았습니다" };
    }

    // tree → flat map. 검증.
    let flat;
    try {
      flat = flatten(args.tree);
    } catch (err) {
      return {
        ok: false,
        error: `트리 구조 오류: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { slug: true, draftVersionId: true },
    });
    if (!page || !page.draftVersionId) {
      return { ok: false, error: "페이지 또는 draft 가 없습니다" };
    }

    const doc: PageDocument = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: newDocId(),
      rootId: flat.rootId,
      nodes: flat.nodes,
      meta: { title: args.title || "AI 생성 페이지", slug: page.slug },
    };
    const v = validatePageDocument(doc);
    if (!v.ok) return { ok: false, error: `검증 실패: ${v.error}` };

    // draft 에 저장(in-place).
    await prisma.pageVersion.update({
      where: { id: page.draftVersionId },
      data: { document: v.doc as unknown as object },
    });
    await prisma.page.update({
      where: { id: pageId },
      data: { title: v.doc.meta.title },
    });

    return { ok: true, doc: v.doc };
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return { ok: false, error: err.message, code: "MISSING_API_KEY" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `페이지 생성 실패: ${msg}` };
  }
}

