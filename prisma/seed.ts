/**
 * 시드 — 기본 사이트("main") + 홈 페이지 1개를 생성한다.
 * 이미 존재하면 건드리지 않는다(idempotent).
 */

import { PrismaClient } from "@prisma/client";
import { createSampleDocument } from "../src/document/fixtures";

const prisma = new PrismaClient();

async function main() {
  // 사이트.
  let site = await prisma.site.findUnique({ where: { slug: "main" } });
  if (!site) {
    site = await prisma.site.create({ data: { slug: "main", name: "Main Site" } });
    console.log("✓ site 'main' created:", site.id);
  } else {
    console.log("· site 'main' already exists:", site.id);
  }

  // 페이지.
  const existing = await prisma.page.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
    include: { draftVersion: true },
  });
  if (existing) {
    console.log("· page 'home' already exists:", existing.id);
    return;
  }

  const doc = createSampleDocument();
  doc.meta.slug = "home";
  doc.meta.title = "어딘가 로스터리";

  // 페이지 → 버전 → 페이지에 draftVersionId 연결 (순환 관계라 두 단계).
  const page = await prisma.page.create({
    data: { siteId: site.id, slug: "home", title: doc.meta.title },
  });
  const draft = await prisma.pageVersion.create({
    data: { pageId: page.id, document: doc as object, label: "초기 시드" },
  });
  await prisma.page.update({
    where: { id: page.id },
    data: { draftVersionId: draft.id },
  });
  console.log("✓ page 'home' created:", page.id, "draft:", draft.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
