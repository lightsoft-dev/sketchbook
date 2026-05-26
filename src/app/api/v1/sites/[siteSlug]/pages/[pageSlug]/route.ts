/**
 * GET /api/v1/sites/[siteSlug]/pages/[pageSlug] — 게시된 PageDocument JSON.
 *
 * ETag = publishedVersionId — 게시 시점에 ETag 가 바뀌어 캐시가 자동 갱신.
 * 헤드리스로 다른 앱이 이 URL 을 그대로 fetch 하면 됨.
 */

import { prisma } from "@/lib/db";
import type { PageDocument } from "@sketchbook/renderer";
import { corsPreflight, errorResponse, jsonResponse } from "@/server/api/headless";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ siteSlug: string; pageSlug: string }> },
) {
  const { siteSlug, pageSlug } = await ctx.params;

  const page = await prisma.page.findFirst({
    where: { slug: pageSlug, site: { slug: siteSlug } },
    include: { site: true, publishedVersion: true },
  });

  if (!page) {
    return errorResponse(404, "PAGE_NOT_FOUND", `페이지가 없습니다`);
  }
  if (!page.publishedVersion) {
    return errorResponse(
      404,
      "NOT_PUBLISHED",
      "페이지가 아직 게시되지 않았습니다 (draft 만 있음)",
    );
  }

  const doc = page.publishedVersion.document as unknown as PageDocument;

  return jsonResponse(
    request,
    {
      site: { slug: page.site.slug, name: page.site.name },
      page: {
        slug: page.slug,
        title: page.title,
        status: page.status,
        publishedAt: page.publishedVersion.createdAt.toISOString(),
        updatedAt: page.updatedAt.toISOString(),
        // SEO 메타는 PageDocument.meta.seo 에서 가져올 수 있음.
        seo: doc.meta?.seo ?? null,
      },
      document: doc,
      schemaVersion: page.publishedVersion.schemaVersion,
    },
    {
      etag: page.publishedVersionId,
      cache: "public",
      schemaVersion: page.publishedVersion.schemaVersion,
    },
  );
}
