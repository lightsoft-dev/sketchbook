/**
 * 게시 페이지 라우트 — DB 의 publishedVersion 을 렌더한다.
 * publishPage 가 호출되면 revalidatePath 로 이 경로의 캐시가 무효화된다.
 */

import { notFound } from "next/navigation";
import { getPublishedDocument } from "@/server/actions/page-actions";
import { PageRenderer } from "@sketchbook/renderer";

export const dynamic = "force-static";
export const revalidate = false;

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getPublishedDocument("main", slug);
  if (!doc) {
    notFound();
  }
  return <PageRenderer doc={doc} mode="view" />;
}
