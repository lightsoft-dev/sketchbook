/**
 * Anthropic 클라이언트 — 모든 AI 텍스트/레이아웃 호출의 진입점.
 *
 * 키 부재를 명시적으로 처리해 UI 가 친절한 에러를 보일 수 있게 한다.
 * 시스템 프롬프트는 프롬프트 캐싱(`cache_control: ephemeral`)을 적극 활용한다.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** 기능별 모델 선택. 비용/속도 균형을 위해 카피·짧은 작업은 Haiku, 무거운 생성은 Sonnet. */
export const MODELS = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
} as const;

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError(
      "ANTHROPIC_API_KEY 환경변수가 필요합니다. .env 에 추가하세요.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export class MissingApiKeyError extends Error {
  code = "MISSING_API_KEY" as const;
}

/** 호출 한 번의 결과 텍스트만 추출. */
export function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
