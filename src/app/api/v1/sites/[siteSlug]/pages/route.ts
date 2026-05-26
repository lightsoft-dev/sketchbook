/**
 * GET /api/v1/sites/[siteSlug]/pages — 페이지 목록.
 *
 * Query params:
 *  - status: "PUBLISHED" | "DRAFT" | "ALL" (default: PUBLISHED)
 *  - limit: 1~100 (default: 50)
 *  - cursor: 마지막 페이지 id (다음 페이지로 넘길 때 그대로 전달)
 */

import { prisma } from "@/lib/db";
import { corsPreflight, errorResponse, jsonResponse } from "@/server/api/headless";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await ctx.params;
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "PUBLISHED").toUpperCase();
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    100,
  );
  const cursor = url.searchParams.get("cursor") ?? undefined;

  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) {
    return errorResponse(404, "SITE_NOT_FOUND", `사이트 '${siteSlug}' 가 없습니다`);
  }

  if (status !== "PUBLISHED" && status !== "DRAFT" && status !== "ALL") {
    return errorResponse(
      400,
      "INVALID_STATUS",
      "status 는 PUBLISHED / DRAFT / ALL 중 하나여야 합니다",
    );
  }

  const where = {
    siteId: site.id,
    ...(status !== "ALL" ? { status: status as "PUBLISHED" | "DRAFT" } : {}),
  };

  const pages = await prisma.page.findMany({
    where,
    take: limit + 1, // hasMore 판단용 +1
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedVersionId: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  const hasMore = pages.length > limit;
  const items = hasMore ? pages.slice(0, limit) : pages;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return jsonResponse(
    request,
    {
      site: { slug: site.slug, name: site.name },
      pages: items.map((p) => ({
        slug: p.slug,
        title: p.title,
        status: p.status,
        hasPublished: p.publishedVersionId !== null,
        updatedAt: p.updatedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      nextCursor,
    },
    { cache: "list" },
  );
}
