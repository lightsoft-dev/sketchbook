/**
 * 폰트 프리셋 — 시스템 폰트와 Google Fonts.
 *
 * 에디터 UI 가 이 목록을 보여주고, 렌더러(에디터 캔버스·게시 페이지)는
 * 사용된 Google Fonts 만 골라 한 줄의 `<link>` 로 로드한다.
 */

import type { PageDocument } from "./types";

export interface FontPreset {
  /** CSS font-family 값(폴백 포함). 노드의 style.fontFamily 에 그대로 저장된다. */
  value: string;
  /** 인스펙터에 표시할 이름. */
  label: string;
  source: "system" | "google";
  /** Google Fonts API 패밀리명(공백 가능). 로드 URL 조립에 사용. */
  googleFamily?: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    value: "system-ui, -apple-system, sans-serif",
    label: "시스템 (Sans)",
    source: "system",
  },
  {
    value: "ui-monospace, 'SF Mono', Menlo, monospace",
    label: "시스템 (Mono)",
    source: "system",
  },
  {
    value: "Georgia, 'Times New Roman', serif",
    label: "시스템 (Serif)",
    source: "system",
  },
  {
    value: "'Inter', sans-serif",
    label: "Inter",
    source: "google",
    googleFamily: "Inter",
  },
  {
    value: "'Noto Sans KR', sans-serif",
    label: "Noto Sans KR",
    source: "google",
    googleFamily: "Noto Sans KR",
  },
  {
    value: "'IBM Plex Sans KR', sans-serif",
    label: "IBM Plex Sans KR",
    source: "google",
    googleFamily: "IBM Plex Sans KR",
  },
  {
    value: "'Plus Jakarta Sans', sans-serif",
    label: "Plus Jakarta Sans",
    source: "google",
    googleFamily: "Plus Jakarta Sans",
  },
  {
    value: "'Playfair Display', serif",
    label: "Playfair Display",
    source: "google",
    googleFamily: "Playfair Display",
  },
  {
    value: "'JetBrains Mono', monospace",
    label: "JetBrains Mono",
    source: "google",
    googleFamily: "JetBrains Mono",
  },
];

/** value 또는 googleFamily 로 프리셋을 찾는다. */
export function findFontPreset(fontFamily: string | undefined): FontPreset | undefined {
  if (!fontFamily) return undefined;
  return FONT_PRESETS.find((p) => p.value === fontFamily);
}

/**
 * 문서에서 사용된 Google Fonts 만 추려 한 줄의 CSS URL 을 만든다.
 * 사용된 폰트가 없으면 null.
 */
export function getGoogleFontsUrl(doc: PageDocument): string | null {
  const used = new Set<string>();
  for (const node of Object.values(doc.nodes)) {
    for (const bp of [node.style.base, node.style.tablet, node.style.mobile]) {
      const ff = bp?.fontFamily;
      if (!ff) continue;
      const preset = FONT_PRESETS.find((p) => p.value === ff);
      if (preset?.source === "google" && preset.googleFamily) {
        used.add(preset.googleFamily);
      }
    }
  }
  if (used.size === 0) return null;
  const families = Array.from(used)
    .map(
      (f) =>
        `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
