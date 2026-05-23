/**
 * 카피라이팅 — Text/Button 노드의 텍스트를 AI 로 다듬는다.
 *
 * 모드:
 *  - improve: 더 자연스럽고 매력적으로 (길이 비슷)
 *  - shorten: 더 짧고 임팩트 있게
 *  - expand:  더 풍부하고 구체적으로
 *  - rewrite: 같은 의미를 다른 표현으로
 *  - translate: 지정 언어로 번역
 *
 * 짧고 빠른 작업이라 Haiku 사용. 시스템 프롬프트는 캐시.
 */

"use server";

import "server-only";
import { z } from "zod";
import { extractText, getAnthropic, MissingApiKeyError, MODELS } from "./client";

const inputSchema = z.object({
  text: z.string().min(1).max(2000),
  mode: z.enum(["improve", "shorten", "expand", "rewrite", "translate"]),
  language: z.string().max(40).optional(),
  context: z.string().max(400).optional(),
});

export type CopywriteInput = z.infer<typeof inputSchema>;
export type CopywriteResult =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: "MISSING_API_KEY" };

const SYSTEM_PROMPT = `당신은 한국어 웹사이트·앱의 UX 카피라이터입니다.
입력 텍스트를 지정된 mode 에 맞게 다듬어 응답합니다.

mode 의미:
- improve: 어색한 표현은 매끄럽게, 임팩트는 강하게. 길이는 비슷하게 유지.
- shorten: 핵심만 남겨 약 절반 길이로. 헤드라인이면 더 짧고 단단하게.
- expand: 의도를 살리며 더 구체적이고 풍부하게. 약 1.5~2배 길이.
- rewrite: 의미는 같지만 표현/어조/구조를 새롭게.
- translate: 지정된 language 로 자연스럽게 번역.

엄격한 응답 규칙:
1. 결과 텍스트만 출력 — 인용부호, 접두어, "여기 있습니다" 같은 머리말 금지.
2. 마크다운 / 코드블록 / 설명 금지.
3. 입력 끝의 줄바꿈은 그대로 유지.
4. 원본이 헤드라인이면 마침표 없이, 본문이면 자연스러운 종결.
5. 이모지는 원본에 없으면 추가하지 않음.`;

export async function aiCopywrite(input: CopywriteInput): Promise<CopywriteResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "유효하지 않은 입력" };
  }
  const { text, mode, language, context } = parsed.data;

  try {
    const client = getAnthropic();

    const userMsg = [
      `mode: ${mode}`,
      language ? `language: ${language}` : null,
      context ? `context: ${context}` : null,
      "",
      "원본:",
      text,
    ]
      .filter((s) => s !== null)
      .join("\n");

    const message = await client.messages.create({
      model: MODELS.fast,
      max_tokens: 800,
      // 프롬프트 캐싱으로 시스템 프롬프트 재사용.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMsg }],
    });

    const out = extractText(message);
    if (!out) return { ok: false, error: "빈 응답" };
    return { ok: true, text: out };
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return { ok: false, error: err.message, code: "MISSING_API_KEY" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI 호출 실패: ${msg}` };
  }
}
