/**
 * Inspector 용 소형 입력 컨트롤 — 라벨 + 컨트롤 한 줄 단위.
 */

"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { FONT_PRESETS, type BoxValue, type Length } from "@sketchbook/renderer";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-neutral-200 px-3 py-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[12px] text-neutral-500">{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded border border-neutral-300 px-2 py-1 text-[12px] text-neutral-800 outline-none focus:border-indigo-400";

/** "100%", "auto", "240" 등을 Length 로 파싱. 빈 문자열은 undefined. */
export function parseDimension(input: string): Length | undefined {
  const t = input.trim();
  if (t === "") return undefined;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

export function dimensionToString(v: Length | undefined): string {
  if (v === undefined) return "";
  return String(v);
}

/** 자유 텍스트 입력(치수 등). */
export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={inputCls}
      value={value}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}

export function NumberField({
  value,
  onChange,
  placeholder,
}: {
  value: number | "";
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      className={inputCls}
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const t = e.target.value.trim();
        onChange(t === "" ? undefined : Number(t));
      }}
    />
  );
}

export function SelectField<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** 색상 입력 — 스와치(color picker) + 자유 텍스트. */
export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string | undefined) => void;
}) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-7 shrink-0 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
      />
      <input
        className={inputCls}
        value={value}
        placeholder="#000000"
        onChange={(e) => onChange(e.target.value.trim() === "" ? undefined : e.target.value)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 크기 모드 (Hug / Fill / Fixed)
// ─────────────────────────────────────────────────────────────

export type SizeMode = "hug" | "fill" | "fixed";

export function getSizeMode(v: Length | undefined): SizeMode {
  if (v === undefined || v === "auto") return "hug";
  if (v === "100%") return "fill";
  return "fixed";
}

/** Hug/Fill/Fixed 세그먼트 + Fixed 일 때 숫자 입력. */
export function SizeControl({
  value,
  onChange,
  placeholder = "240",
}: {
  value: Length | undefined;
  onChange: (v: Length | undefined) => void;
  placeholder?: string;
}) {
  const mode = getSizeMode(value);
  const setMode = (m: SizeMode) => {
    if (m === "hug") onChange("auto");
    else if (m === "fill") onChange("100%");
    else {
      const numeric = typeof value === "number" ? value : 240;
      onChange(numeric);
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex shrink-0 overflow-hidden rounded border border-neutral-300">
        {(
          [
            { v: "hug", label: "Hug" },
            { v: "fill", label: "Fill" },
            { v: "fixed", label: "Fixed" },
          ] as const
        ).map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setMode(o.v)}
            className={`px-1.5 py-1 text-[10px] ${
              mode === o.v
                ? "bg-indigo-500 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {mode === "fixed" && (
        <input
          type="text"
          inputMode="numeric"
          className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-[12px] outline-none focus:border-indigo-400"
          value={dimensionToString(value)}
          placeholder={placeholder}
          onChange={(e) => onChange(parseDimension(e.target.value))}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4방향 박스 값 (padding / margin / borderRadius / borderWidth)
// ─────────────────────────────────────────────────────────────

function isUniform(v: BoxValue | undefined): boolean {
  if (!v) return true;
  return (
    String(v.top) === String(v.right) &&
    String(v.right) === String(v.bottom) &&
    String(v.bottom) === String(v.left)
  );
}

export function BoxField({
  value,
  onChange,
}: {
  value: BoxValue | undefined;
  onChange: (v: BoxValue | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const uniform = isUniform(value);
  // 잠금 상태 — uniform 이면 1칸, 아니면 자동 펼침.
  const show4 = expanded || !uniform;

  const update = (side: keyof BoxValue, raw: string) => {
    const n = parseDimension(raw);
    const base: BoxValue =
      value ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const next: BoxValue = { ...base, [side]: n ?? 0 };
    if (n === undefined && next.top === 0 && next.right === 0 && next.bottom === 0 && next.left === 0) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  const updateAll = (raw: string) => {
    const n = parseDimension(raw);
    if (n === undefined) {
      onChange(undefined);
      return;
    }
    onChange({ top: n, right: n, bottom: n, left: n });
  };

  if (!show4) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          className="w-full rounded border border-neutral-300 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
          value={dimensionToString(value?.top)}
          placeholder="0"
          onChange={(e) => updateAll(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded border border-neutral-300 px-1.5 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100"
          title="4방향 분리"
        >
          ⊞
        </button>
      </div>
    );
  }

  const cell = (side: keyof BoxValue, label: string) => (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        className="w-full rounded border border-neutral-300 px-2 py-1 pr-4 text-[12px] outline-none focus:border-indigo-400"
        value={dimensionToString(value?.[side])}
        placeholder="0"
        onChange={(e) => update(side, e.target.value)}
      />
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400">
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1">
        {cell("top", "T")}
        {cell("right", "R")}
        {cell("bottom", "B")}
        {cell("left", "L")}
      </div>
      <button
        type="button"
        onClick={() => {
          setExpanded(false);
          // 묶기: 첫 값으로 4방향 통일.
          if (value) {
            onChange({ top: value.top, right: value.top, bottom: value.top, left: value.top });
          }
        }}
        className="w-full rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100"
        title="한 값으로 묶기"
      >
        ▤ 한 값으로
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9분면 정렬 (Figma 식 정렬 위젯)
// ─────────────────────────────────────────────────────────────

const AXIS_VALUES = ["flex-start", "center", "flex-end"] as const;
type AxisVal = (typeof AXIS_VALUES)[number];

function indexOfAxis(v: string | undefined): number {
  const i = AXIS_VALUES.indexOf((v ?? "flex-start") as AxisVal);
  return i === -1 ? 0 : i;
}

/**
 * 3×3 셀 — 각 셀이 flexDirection 에 맞춰 (justify, align) 조합을 표현한다.
 * row 일 때: x=justify, y=align. column 일 때: x=align, y=justify.
 */
export function AlignmentGrid({
  flexDirection,
  justifyContent,
  alignItems,
  onChange,
}: {
  flexDirection: "row" | "column" | undefined;
  justifyContent: string | undefined;
  alignItems: string | undefined;
  onChange: (justify: AxisVal, align: AxisVal) => void;
}) {
  const isRow = (flexDirection ?? "column") === "row";
  const ji = indexOfAxis(justifyContent);
  const ai = indexOfAxis(alignItems);
  const activeX = isRow ? ji : ai;
  const activeY = isRow ? ai : ji;

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded border border-neutral-300 bg-white">
      {[0, 1, 2].map((y) =>
        [0, 1, 2].map((x) => {
          const active = x === activeX && y === activeY;
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => {
                const xVal = AXIS_VALUES[x];
                const yVal = AXIS_VALUES[y];
                if (isRow) onChange(xVal, yVal);
                else onChange(yVal, xVal);
              }}
              className={`flex h-7 items-center justify-center border-r border-b border-neutral-200 last-of-type:border-r-0 ${
                active ? "bg-indigo-500" : "hover:bg-neutral-50"
              }`}
              title={`${["start", "center", "end"][x]} / ${["top", "middle", "bottom"][y]}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  active ? "bg-white" : "bg-neutral-300"
                }`}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FontFamily — 프리셋 선택 + 직접 입력
// ─────────────────────────────────────────────────────────────

const CUSTOM_SENTINEL = "__custom__";

export function FontFamilyField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const preset = FONT_PRESETS.find((p) => p.value === value);
  const [customMode, setCustomMode] = useState(!preset && !!value);

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <input
          className="w-full rounded border border-neutral-300 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
          value={value ?? ""}
          placeholder="Inter, sans-serif"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        <button
          type="button"
          onClick={() => setCustomMode(false)}
          className="rounded border border-neutral-300 px-1.5 py-1 text-[10px] text-neutral-500 hover:bg-neutral-100"
          title="프리셋으로"
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <select
      className="w-full rounded border border-neutral-300 px-2 py-1 text-[12px] outline-none focus:border-indigo-400"
      value={preset?.value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === CUSTOM_SENTINEL) {
          setCustomMode(true);
          return;
        }
        onChange(v || undefined);
      }}
    >
      <option value="">— 상속 —</option>
      {FONT_PRESETS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
      <option value={CUSTOM_SENTINEL}>직접 입력…</option>
    </select>
  );
}

// ─────────────────────────────────────────────────────────────
// 토글 아이콘 버튼 (italic / underline)
// ─────────────────────────────────────────────────────────────

export function ToggleIconButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded border text-[12px] ${
        active
          ? "border-indigo-500 bg-indigo-500 text-white"
          : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

/** 라디오형 세그먼트 버튼 그룹. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded border border-neutral-300">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-1.5 py-1 text-[11px] ${
            value === o.value
              ? "bg-indigo-500 text-white"
              : "bg-white text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
