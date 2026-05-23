/**
 * AI 이미지 생성 — Replicate 의 Flux schnell 모델 사용.
 *
 * MVP: Replicate 가 호스팅하는 결과 URL 을 그대로 반환한다. 이 URL 은 시간 지나면
 * 만료될 수 있으므로 향후 S3/R2 등 우리 스토리지로 미러링하는 단계를 추가한다.
 *
 * Flux schnell: 1~2초 안에 생성, 이미지당 ~$0.003.
 */

"use server";

import "server-only";
import Replicate from "replicate";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(1).max(1500),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]).default("16:9"),
});

export type GenerateImageInput = z.infer<typeof inputSchema>;
export type GenerateImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string; code?: "MISSING_API_KEY" };

export async function aiGenerateImage(
  input: GenerateImageInput,
): Promise<GenerateImageResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "유효하지 않은 입력" };
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      code: "MISSING_API_KEY",
      error: "REPLICATE_API_TOKEN 환경변수가 필요합니다 (.env)",
    };
  }

  try {
    const replicate = new Replicate({ auth: token });

    const output = (await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: parsed.data.prompt,
        aspect_ratio: parsed.data.aspectRatio,
        num_outputs: 1,
        output_format: "webp",
        output_quality: 85,
      },
    })) as unknown;

    const first = Array.isArray(output) ? output[0] : output;
    let url: string;
    if (typeof first === "string") {
      url = first;
    } else if (first && typeof (first as { url?: () => URL }).url === "function") {
      url = String((first as { url: () => URL }).url());
    } else {
      url = String(first);
    }

    if (!url || !/^https?:\/\//.test(url)) {
      return { ok: false, error: "이미지 URL 을 받지 못했습니다" };
    }
    return { ok: true, url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `이미지 생성 실패: ${msg}` };
  }
}
