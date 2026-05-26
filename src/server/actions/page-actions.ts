/**
 * 페이지 관련 서버 액션 — 에디터 ↔ DB 의 단일 통로.
 *
 * - autosave: 같은 draft PageVersion 의 document 를 in-place 갱신(row 폭증 방지)
 * - publish: 현재 draft 를 복제해 새 PageVersion 을 만든 뒤 publishedVersionId 갱신,
 *            게시 라우트 ISR 무효화.
 */

"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validatePageDocument } from "@sketchbook/renderer";
import type { PageDocument } from "@sketchbook/renderer";

const DEFAULT_SITE_SLUG = "main";

export interface EditorPageBundle {
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  siteSlug: string;
  doc: PageDocument;
  hasPublished: boolean;
}

/** 에디터가 열릴 때 호출 — 페이지 + 현재 draft 문서를 함께 반환. */
export async function getEditorPage(
  siteSlug = DEFAULT_SITE_SLUG,
  pageSlug = "home",
): Promise<EditorPageBundle | null> {
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return null;

  const page = await prisma.page.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: pageSlug } },
    include: { draftVersion: true },
  });
  if (!page || !page.draftVersion) return null;

  return {
    pageId: page.id,
    pageSlug: page.slug,
    pageTitle: page.title,
    siteSlug,
    doc: page.draftVersion.document as unknown as PageDocument,
    hasPublished: page.publishedVersionId !== null,
  };
}

/**
 * draft 자동 저장 — 현재 draft PageVersion 의 document 만 갱신한다.
 * 새 row 를 만들지 않아 autosave 로 인한 폭증을 막는다.
 */
export async function savePageDraft(
  pageId: string,
  document: PageDocument,
): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const v = validatePageDocument(document);
  if (!v.ok) return { ok: false, error: v.error };

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { draftVersionId: true },
  });
  if (!page || !page.draftVersionId) {
    return { ok: false, error: "draft 버전이 없는 페이지입니다" };
  }

  await prisma.pageVersion.update({
    where: { id: page.draftVersionId },
    data: { document: v.doc as unknown as object },
  });

  return { ok: true, savedAt: new Date().toISOString() };
}

/**
 * 게시 — 현재 draft 를 복제해 새 PageVersion 을 만들고 publishedVersionId 를 가리킨다.
 * 트랜잭션으로 묶고, 마지막에 게시 라우트의 ISR 캐시를 무효화한다.
 */
export async function publishPage(
  pageId: string,
): Promise<{ ok: true; publishedVersionId: string } | { ok: false; error: string }> {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { draftVersion: true, site: true },
  });
  if (!page || !page.draftVersion) {
    return { ok: false, error: "게시할 draft 가 없습니다" };
  }

  const v = validatePageDocument(page.draftVersion.document);
  if (!v.ok) return { ok: false, error: `유효하지 않은 문서: ${v.error}` };

  const result = await prisma.$transaction(async (tx) => {
    const versionCount = await tx.pageVersion.count({ where: { pageId } });
    const newVersion = await tx.pageVersion.create({
      data: {
        pageId,
        // 검증된 문서를 그대로 새 버전에 복제.
        document: v.doc as unknown as object,
        schemaVersion: page.draftVersion!.schemaVersion,
        label: `게시 v${versionCount}`,
      },
    });
    await tx.page.update({
      where: { id: pageId },
      data: {
        publishedVersionId: newVersion.id,
        status: "PUBLISHED",
      },
    });
    return newVersion;
  });

  // ISR 무효화 — 같은 슬러그 게시 라우트를 다시 만들도록.
  revalidatePath(`/p/${page.slug}`);

  return { ok: true, publishedVersionId: result.id };
}

/** 게시된 페이지의 문서를 반환 — /p/[slug] 라우트에서 사용. */
export async function getPublishedDocument(
  siteSlug: string,
  pageSlug: string,
): Promise<PageDocument | null> {
  const page = await prisma.page.findFirst({
    where: { slug: pageSlug, site: { slug: siteSlug } },
    include: { publishedVersion: true },
  });
  if (!page?.publishedVersion) return null;
  return page.publishedVersion.document as unknown as PageDocument;
}
