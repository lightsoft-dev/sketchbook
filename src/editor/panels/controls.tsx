/**
 * Inspector 용 소형 입력 컨트롤 — 라벨 + 컨트롤 한 줄 단위.
 */

"use client";

import type { ChangeEvent, ReactNode } from "react";
import type { Length } from "@/document/types";

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
