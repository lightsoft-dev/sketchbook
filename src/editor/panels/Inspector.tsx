/**
 * Inspector — 우측 속성 패널. 선택 노드를 현재 breakpoint 기준으로 편집한다.
 *
 * 스타일 수정은 store.updateStyle 을 거쳐 activeBreakpoint 에만 기록된다.
 * 표시값은 base + breakpoint override 를 병합한 결과.
 */

"use client";

import type { BoxValue, Length, Node, StyleProps } from "@/document/types";
import { applyLayoutModeChange } from "../canvas/layout-convert";
import { useEditorStore } from "../state/store";
import {
  ColorField,
  Row,
  Section,
  Segmented,
  SelectField,
  TextField,
  dimensionToString,
  parseDimension,
} from "./controls";

/** base + 현재 breakpoint override 를 병합한 표시용 스타일. */
function resolveStyleAt(node: Node, bp: "base" | "tablet" | "mobile"): StyleProps {
  if (bp === "base") return node.style.base;
  return { ...node.style.base, ...(node.style[bp] ?? {}) };
}

function uniformBox(n: Length): BoxValue {
  return { top: n, right: n, bottom: n, left: n };
}

export function Inspector() {
  const doc = useEditorStore((s) => s.doc);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeBreakpoint = useEditorStore((s) => s.activeBreakpoint);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const updateProps = useEditorStore((s) => s.updateProps);
  const rename = useEditorStore((s) => s.rename);

  const node = selectedIds[0] ? doc.nodes[selectedIds[0]] : undefined;

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-neutral-400">
        노드를 선택하면
        <br />
        속성이 여기에 표시됩니다
      </div>
    );
  }

  const id = node.id;
  const style = resolveStyleAt(node, activeBreakpoint);

  /** 스타일 한 속성 갱신. 같은 노드·속성의 연속 변경은 한 undo 로 병합. */
  const setStyle = (patch: Partial<StyleProps>) => {
    const key = `style:${id}:${Object.keys(patch).join(",")}`;
    updateStyle(id, patch, { coalesceKey: key });
  };

  const isRoot = id === doc.rootId;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* 헤더 */}
      <div className="border-b border-neutral-200 px-3 py-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">
            {node.type}
          </span>
          {activeBreakpoint !== "base" && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              {activeBreakpoint}
            </span>
          )}
        </div>
        <input
          className="w-full rounded border border-transparent px-1 py-0.5 text-[13px] font-medium text-neutral-800 hover:border-neutral-200 focus:border-indigo-400 focus:outline-none"
          value={node.name}
          onChange={(e) => rename(id, e.target.value)}
        />
      </div>

      {/* 콘텐츠 (props) */}
      {node.type === "Text" && (
        <Section title="콘텐츠">
          <textarea
            className="w-full rounded border border-neutral-300 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
            rows={3}
            value={node.props.text}
            onChange={(e) => updateProps(id, { text: e.target.value })}
          />
          <Row label="태그">
            <SelectField
              value={node.props.as ?? "p"}
              options={[
                { value: "h1", label: "H1" },
                { value: "h2", label: "H2" },
                { value: "h3", label: "H3" },
                { value: "h4", label: "H4" },
                { value: "p", label: "본문 (p)" },
                { value: "span", label: "Span" },
              ]}
              onChange={(v) => updateProps(id, { as: v })}
            />
          </Row>
        </Section>
      )}

      {node.type === "Button" && (
        <Section title="콘텐츠">
          <Row label="라벨">
            <TextField
              value={node.props.label}
              onChange={(v) => updateProps(id, { label: v })}
            />
          </Row>
          <Row label="링크">
            <TextField
              value={node.props.href ?? ""}
              placeholder="https://"
              onChange={(v) => updateProps(id, { href: v || undefined })}
            />
          </Row>
        </Section>
      )}

      {node.type === "Image" && (
        <Section title="콘텐츠">
          <Row label="이미지 URL">
            <TextField
              value={node.props.src ?? ""}
              placeholder="https://"
              onChange={(v) => updateProps(id, { src: v || undefined })}
            />
          </Row>
          <Row label="대체 텍스트">
            <TextField
              value={node.props.alt}
              onChange={(v) => updateProps(id, { alt: v })}
            />
          </Row>
        </Section>
      )}

      {/* 레이아웃 (Frame) */}
      {node.type === "Frame" && (
        <Section title="레이아웃">
          <Row label="방향">
            <Segmented
              value={style.flexDirection ?? "column"}
              options={[
                { value: "column", label: "세로" },
                { value: "row", label: "가로" },
              ]}
              onChange={(v) => setStyle({ display: "flex", flexDirection: v })}
            />
          </Row>
          <Row label="간격">
            <TextField
              value={dimensionToString(style.gap)}
              placeholder="0"
              onChange={(v) => setStyle({ gap: parseDimension(v) })}
            />
          </Row>
          <Row label="가로 정렬">
            <SelectField
              value={style.justifyContent ?? "flex-start"}
              options={ALIGN_OPTIONS}
              onChange={(v) => setStyle({ justifyContent: v })}
            />
          </Row>
          <Row label="세로 정렬">
            <SelectField
              value={style.alignItems ?? "flex-start"}
              options={ALIGN_OPTIONS}
              onChange={(v) => setStyle({ alignItems: v })}
            />
          </Row>
        </Section>
      )}

      {/* 크기 & 위치 */}
      <Section title="크기">
        <Row label="너비">
          <TextField
            value={dimensionToString(style.width)}
            placeholder="auto"
            onChange={(v) => setStyle({ width: parseDimension(v) })}
          />
        </Row>
        <Row label="높이">
          <TextField
            value={dimensionToString(style.height)}
            placeholder="auto"
            onChange={(v) => setStyle({ height: parseDimension(v) })}
          />
        </Row>
        {!isRoot && (
          <Row label="배치">
            <Segmented
              value={node.layoutMode ?? "flow"}
              options={[
                { value: "flow", label: "흐름" },
                { value: "absolute", label: "자유" },
              ]}
              onChange={(v) => applyLayoutModeChange(id, v)}
            />
          </Row>
        )}
      </Section>

      {/* 여백 */}
      <Section title="여백">
        <Row label="안쪽(padding)">
          <TextField
            value={dimensionToString(style.padding?.top)}
            placeholder="0"
            onChange={(v) => {
              const d = parseDimension(v);
              setStyle({ padding: d === undefined ? undefined : uniformBox(d) });
            }}
          />
        </Row>
        <Row label="바깥(margin)">
          <TextField
            value={dimensionToString(style.margin?.top)}
            placeholder="0"
            onChange={(v) => {
              const d = parseDimension(v);
              setStyle({ margin: d === undefined ? undefined : uniformBox(d) });
            }}
          />
        </Row>
      </Section>

      {/* 타이포 */}
      {(node.type === "Text" || node.type === "Button") && (
        <Section title="텍스트">
          <Row label="크기">
            <TextField
              value={dimensionToString(style.fontSize)}
              placeholder="16"
              onChange={(v) => setStyle({ fontSize: parseDimension(v) })}
            />
          </Row>
          <Row label="굵기">
            <SelectField
              value={String(style.fontWeight ?? 400)}
              options={[
                { value: "400", label: "보통" },
                { value: "500", label: "중간" },
                { value: "600", label: "세미볼드" },
                { value: "700", label: "볼드" },
                { value: "800", label: "엑스트라볼드" },
              ]}
              onChange={(v) => setStyle({ fontWeight: Number(v) })}
            />
          </Row>
          <Row label="정렬">
            <Segmented
              value={style.textAlign ?? "left"}
              options={[
                { value: "left", label: "좌" },
                { value: "center", label: "중" },
                { value: "right", label: "우" },
              ]}
              onChange={(v) => setStyle({ textAlign: v })}
            />
          </Row>
          <Row label="색상">
            <ColorField
              value={style.color ?? ""}
              onChange={(v) => setStyle({ color: v })}
            />
          </Row>
        </Section>
      )}

      {/* 외형 */}
      <Section title="외형">
        <Row label="배경색">
          <ColorField
            value={
              style.background?.type === "solid" ? style.background.color : ""
            }
            onChange={(v) =>
              setStyle({
                background: v ? { type: "solid", color: v } : undefined,
              })
            }
          />
        </Row>
        <Row label="모서리">
          <TextField
            value={dimensionToString(style.borderRadius?.top)}
            placeholder="0"
            onChange={(v) => {
              const d = parseDimension(v);
              setStyle({
                borderRadius: d === undefined ? undefined : uniformBox(d),
              });
            }}
          />
        </Row>
      </Section>
    </div>
  );
}

const ALIGN_OPTIONS = [
  { value: "flex-start" as const, label: "시작" },
  { value: "center" as const, label: "가운데" },
  { value: "flex-end" as const, label: "끝" },
  { value: "space-between" as const, label: "양끝" },
  { value: "stretch" as const, label: "늘이기" },
];
