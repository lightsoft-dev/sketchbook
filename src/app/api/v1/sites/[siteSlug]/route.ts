/**
 * GET /api/v1/sites/[siteSlug] — 사이트 메타데이터 + 게시 페이지 수.
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

  const site = await prisma.site.findUnique({
    where: { slug: siteSlug },
    include: {
      _count: { select: { pages: true } },
    },
  });
  if (!site) {
    return errorResponse(404, "SITE_NOT_FOUND", `사이트 '${siteSlug}' 가 없습니다`);
  }

  const publishedCount = await prisma.page.count({
    where: { siteId: site.id, status: "PUBLISHED" },
  });

  return jsonResponse(
    request,
    {
      slug: site.slug,
      name: site.name,
      createdAt: site.createdAt.toISOString(),
      pageCount: site._count.pages,
      publishedCount,
    },
    { cache: "list", etag: `site-${site.id}-${publishedCount}` },
  );
}
