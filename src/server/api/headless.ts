/**
 * 헤드리스 API 공통 헬퍼 — CORS, 캐시, ETag, 에러 응답.
 *
 * 외부 앱(브라우저·다른 Next 앱·서버)에서 PageDocument JSON 을 그대로 fetch 할 수 있게
 * 안전한 기본값을 제공한다.
 */

import "server-only";
import { NextResponse } from "next/server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Expose-Headers": "ETag, X-Sketchbook-Schema-Version",
  "Access-Control-Max-Age": "86400",
};

const CACHE_PUBLIC = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
const CACHE_LIST = "public, max-age=0, s-maxage=30, stale-while-revalidate=120";

export interface JsonResponseOpts {
  /** ETag 로 사용할 안정적 값(예: publishedVersionId). 같으면 304 응답. */
  etag?: string | null;
  /** 캐시 모드 — published page 는 'public', 목록은 'list', 그 외 'none'. */
  cache?: "public" | "list" | "none";
  /** 추가 헤더. */
  headers?: Record<string, string>;
  /** PageDocument 의 schemaVersion 을 응답 헤더로 노출. */
  schemaVersion?: number;
}

/** JSON 응답을 만든다. CORS / 캐시 / ETag 자동 처리. */
export function jsonResponse(
  request: Request,
  data: unknown,
  opts: JsonResponseOpts = {},
): Response {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  headers["Content-Type"] = "application/json; charset=utf-8";

  if (opts.cache === "public") headers["Cache-Control"] = CACHE_PUBLIC;
  else if (opts.cache === "list") headers["Cache-Control"] = CACHE_LIST;
  else headers["Cache-Control"] = "no-store";

  if (opts.etag) {
    const etag = `"${opts.etag}"`;
    headers["ETag"] = etag;
    // 클라이언트가 보낸 ETag 가 동일하면 304.
    const reqEtag = request.headers.get("If-None-Match");
    if (reqEtag && reqEtag === etag) {
      return new Response(null, { status: 304, headers });
    }
  }
  if (opts.schemaVersion !== undefined) {
    headers["X-Sketchbook-Schema-Version"] = String(opts.schemaVersion);
  }
  if (opts.headers) Object.assign(headers, opts.headers);

  return new Response(JSON.stringify(data), { status: 200, headers });
}

/** 표준 에러 응답. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return new Response(
    JSON.stringify({ error: { code, message } }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

/** CORS preflight 응답. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Next API 가 NextResponse 를 선호하는 경우용 export. */
export const HeadlessNext = { NextResponse };
