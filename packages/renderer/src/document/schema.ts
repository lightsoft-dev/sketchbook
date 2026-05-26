/**
 * Zod 스키마 — `PageDocument` 의 런타임 검증.
 *
 * 쓰이는 곳: DB 저장 전 검증 / AI 출력 검증(신뢰 경계) / 패치 적용 후 정합성 확인.
 * 손으로 쓴 `types.ts` 가 타입의 원천이고, 이 파일은 그 형태를 런타임에서 강제한다.
 */

import { z } from "zod";
import type { PageDocument } from "./types";

const zLength = z.union([z.number(), z.string()]);
const zColor = z.string();

const zBoxValue = z.object({
  top: zLength,
  right: zLength,
  bottom: zLength,
  left: zLength,
});

const zShadow = z.object({
  x: zLength,
  y: zLength,
  blur: zLength,
  spread: zLength,
  color: zColor,
  inset: z.boolean().optional(),
});

const zFill = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: zColor }),
  z.object({ type: z.literal("gradient"), css: z.string() }),
  z.object({
    type: z.literal("image"),
    src: z.string(),
    size: z.enum(["cover", "contain"]),
  }),
]);

const zFlexAlign = z.enum([
  "flex-start",
  "center",
  "flex-end",
  "stretch",
  "space-between",
  "space-around",
  "baseline",
]);

const zStyleProps = z
  .object({
    display: z.enum(["flex", "block", "grid", "none"]),
    flexDirection: z.enum(["row", "column"]),
    flexWrap: z.enum(["nowrap", "wrap"]),
    justifyContent: zFlexAlign,
    alignItems: zFlexAlign,
    gap: zLength,
    flexGrow: z.number(),
    flexShrink: z.number(),
    alignSelf: z.union([zFlexAlign, z.literal("auto")]),
    position: z.enum(["relative", "absolute", "sticky"]),
    top: zLength,
    right: zLength,
    bottom: zLength,
    left: zLength,
    zIndex: z.number(),
    width: zLength,
    height: zLength,
    minWidth: zLength,
    minHeight: zLength,
    maxWidth: zLength,
    maxHeight: zLength,
    padding: zBoxValue,
    margin: zBoxValue,
    borderRadius: zBoxValue,
    borderWidth: zBoxValue,
    borderColor: zColor,
    borderStyle: z.enum(["solid", "dashed", "none"]),
    background: zFill,
    opacity: z.number(),
    boxShadow: z.array(zShadow),
    overflow: z.enum(["visible", "hidden", "auto"]),
    color: zColor,
    fontFamily: z.string(),
    fontSize: zLength,
    fontWeight: z.number(),
    lineHeight: zLength,
    letterSpacing: zLength,
    textAlign: z.enum(["left", "center", "right", "justify"]),
    textTransform: z.enum(["none", "uppercase", "lowercase", "capitalize"]),
    objectFit: z.enum(["cover", "contain", "fill", "none"]),
  })
  .partial();

const zResponsiveStyle = z.object({
  base: zStyleProps,
  tablet: zStyleProps.optional(),
  mobile: zStyleProps.optional(),
});

const zHidden = z
  .object({ base: z.boolean(), tablet: z.boolean(), mobile: z.boolean() })
  .partial()
  .optional();

const zNodeCommon = {
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  style: zResponsiveStyle,
  layoutMode: z.enum(["flow", "absolute"]).optional(),
  hidden: zHidden,
  locked: z.boolean().optional(),
};

const zNode = z.discriminatedUnion("type", [
  z.object({
    ...zNodeCommon,
    type: z.literal("Frame"),
    props: z.object({
      as: z
        .enum(["div", "section", "header", "footer", "nav", "main", "article"])
        .optional(),
    }),
  }),
  z.object({
    ...zNodeCommon,
    type: z.literal("Text"),
    props: z.object({
      text: z.string(),
      as: z.enum(["p", "h1", "h2", "h3", "h4", "span"]).optional(),
    }),
  }),
  z.object({
    ...zNodeCommon,
    type: z.literal("Image"),
    props: z.object({
      src: z.string().optional(),
      alt: z.string(),
    }),
  }),
  z.object({
    ...zNodeCommon,
    type: z.literal("Button"),
    props: z.object({
      label: z.string(),
      href: z.string().optional(),
      target: z.enum(["_self", "_blank"]).optional(),
    }),
  }),
]);

export const zPageDocument = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  rootId: z.string(),
  nodes: z.record(z.string(), zNode),
  meta: z.object({
    title: z.string(),
    slug: z.string(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        ogImage: z.string().optional(),
      })
      .optional(),
  }),
});

export type ValidationResult =
  | { ok: true; doc: PageDocument }
  | { ok: false; error: string };

/** 임의 입력을 `PageDocument` 로 검증한다. 참조 무결성도 함께 확인한다. */
export function validatePageDocument(input: unknown): ValidationResult {
  const parsed = zPageDocument.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error) };
  }
  const doc = parsed.data as PageDocument;

  // 참조 무결성: rootId 존재, children 이 가리키는 노드 존재, parentId 일관성.
  if (!doc.nodes[doc.rootId]) {
    return { ok: false, error: `rootId "${doc.rootId}" 에 해당하는 노드가 없음` };
  }
  for (const node of Object.values(doc.nodes)) {
    for (const childId of node.children) {
      const child = doc.nodes[childId];
      if (!child) {
        return { ok: false, error: `노드 "${node.id}" 의 자식 "${childId}" 가 없음` };
      }
      if (child.parentId !== node.id) {
        return {
          ok: false,
          error: `노드 "${childId}" 의 parentId 가 "${node.id}" 와 불일치`,
        };
      }
    }
  }
  return { ok: true, doc };
}
