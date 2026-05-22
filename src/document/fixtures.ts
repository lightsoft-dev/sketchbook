/**
 * 샘플 문서 — 렌더러/에디터 개발 및 테스트용.
 * 카페 소개 랜딩 페이지를 TreeNode 로 작성한 뒤 플랫 맵으로 변환한다.
 */

import { CURRENT_SCHEMA_VERSION, type PageDocument, type TreeNode } from "./types";
import { flatten } from "./tree";
import { newDocId } from "./ids";

function featureCard(title: string, body: string): TreeNode {
  return {
    type: "Frame",
    name: `Feature — ${title}`,
    style: {
      base: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: { top: 28, right: 28, bottom: 28, left: 28 },
        borderWidth: { top: 1, right: 1, bottom: 1, left: 1 },
        borderColor: "#e5e0d8",
        borderStyle: "solid",
        borderRadius: { top: 14, right: 14, bottom: 14, left: 14 },
        background: { type: "solid", color: "#ffffff" },
        flexGrow: 1,
        flexShrink: 1,
        width: 0,
      },
      mobile: { width: "100%" },
    },
    children: [
      {
        type: "Text",
        name: "Feature Title",
        props: { text: title, as: "h3" },
        style: { base: { fontSize: 19, fontWeight: 700, color: "#2a2520" } },
      },
      {
        type: "Text",
        name: "Feature Body",
        props: { text: body, as: "p" },
        style: { base: { fontSize: 15, lineHeight: 1.6, color: "#6b6358" } },
      },
    ],
  };
}

const tree: TreeNode = {
  type: "Frame",
  name: "Page",
  props: { as: "main" },
  style: {
    base: {
      display: "flex",
      flexDirection: "column",
      gap: 0,
      width: "100%",
      minHeight: "100vh",
      background: { type: "solid", color: "#faf7f2" },
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
  },
  children: [
    // ── Hero ──
    {
      type: "Frame",
      name: "Hero",
      props: { as: "header" },
      style: {
        base: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: { top: 120, right: 32, bottom: 120, left: 32 },
          background: {
            type: "gradient",
            css: "linear-gradient(160deg,#2a2520 0%,#4a4036 100%)",
          },
        },
        mobile: { padding: { top: 72, right: 20, bottom: 72, left: 20 } },
      },
      children: [
        {
          type: "Text",
          name: "Hero Title",
          props: { text: "따뜻한 한 잔의 휴식", as: "h1" },
          style: {
            base: {
              fontSize: 52,
              fontWeight: 800,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.15,
              letterSpacing: -1,
            },
            mobile: { fontSize: 32 },
          },
        },
        {
          type: "Text",
          name: "Hero Subtitle",
          props: {
            text: "도심 속 작은 로스터리. 매일 아침 직접 볶은 원두로 내립니다.",
            as: "p",
          },
          style: {
            base: {
              fontSize: 18,
              color: "#d8cfc2",
              textAlign: "center",
              maxWidth: 480,
              lineHeight: 1.6,
            },
            mobile: { fontSize: 15 },
          },
        },
        {
          type: "Button",
          name: "Hero CTA",
          props: { label: "메뉴 보기", href: "#menu" },
          style: {
            base: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: { top: 14, right: 32, bottom: 14, left: 32 },
              background: { type: "solid", color: "#e8a04c" },
              color: "#2a2520",
              fontSize: 16,
              fontWeight: 700,
              borderRadius: { top: 999, right: 999, bottom: 999, left: 999 },
            },
          },
        },
      ],
    },

    // ── Features ──
    {
      type: "Frame",
      name: "Features",
      props: { as: "section" },
      style: {
        base: {
          display: "flex",
          flexDirection: "row",
          gap: 20,
          padding: { top: 80, right: 48, bottom: 80, left: 48 },
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
        },
        mobile: {
          flexDirection: "column",
          padding: { top: 48, right: 20, bottom: 48, left: 20 },
        },
      },
      children: [
        featureCard("싱글 오리진", "산지별 개성이 살아 있는 원두만 골라 소량으로 로스팅합니다."),
        featureCard("느린 공간", "분주한 도심에서 잠시 멈춰 갈 수 있는 조용한 자리를 준비했어요."),
        featureCard("매일 베이킹", "커피와 어울리는 구움과자를 매장에서 직접 굽습니다."),
      ],
    },

    // ── CTA ──
    {
      type: "Frame",
      name: "CTA",
      props: { as: "section" },
      style: {
        base: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: { top: 80, right: 32, bottom: 96, left: 32 },
          background: { type: "solid", color: "#ffffff" },
        },
      },
      children: [
        {
          type: "Text",
          name: "CTA Title",
          props: { text: "오늘, 한 잔 하러 오세요", as: "h2" },
          style: {
            base: { fontSize: 34, fontWeight: 800, color: "#2a2520", textAlign: "center" },
            mobile: { fontSize: 24 },
          },
        },
        {
          type: "Text",
          name: "CTA Address",
          props: { text: "서울시 어딘가 1-2 · 매일 09:00–21:00", as: "p" },
          style: { base: { fontSize: 15, color: "#6b6358", textAlign: "center" } },
        },
        {
          type: "Button",
          name: "CTA Button",
          props: { label: "길찾기", href: "https://map.example.com", target: "_blank" },
          style: {
            base: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: { top: 13, right: 28, bottom: 13, left: 28 },
              background: { type: "solid", color: "#2a2520" },
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: { top: 999, right: 999, bottom: 999, left: 999 },
            },
          },
        },
      ],
    },
  ],
};

/** 카페 랜딩 페이지 샘플 문서를 생성한다. */
export function createSampleDocument(): PageDocument {
  const { rootId, nodes } = flatten(tree);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: newDocId(),
    rootId,
    nodes,
    meta: { title: "어딘가 로스터리", slug: "cafe" },
  };
}
