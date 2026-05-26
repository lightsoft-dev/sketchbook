/**
 * AutoLayoutSection — Inspector 의 "자동 정렬" 섹션.
 * 한 번 클릭으로 노드 / 자식들의 레이아웃을 정돈하는 빠른 액션 모음.
 */

"use client";

import type { Node } from "@sketchbook/renderer";
import {
  centerAll,
  distributeChildrenEvenly,
  fillChildrenMainAxis,
  fillParent,
  hugNode,
  smartResetFrame,
  stretchChildren,
} from "../state/auto-layout";

export function AutoLayoutSection({ node, isRoot }: { node: Node; isRoot: boolean }) {
  const isFrame = node.type === "Frame";

  return (
    <div className="border-b border-neutral-200 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          자동 정렬
        </span>
        <span className="text-[10px] text-neutral-400">한 번에 정돈</span>
      </div>

      {/* 모든 노드 — Hug / Fill 단축 */}
      {!isRoot && (
        <div className="mb-2 grid grid-cols-2 gap-1">
          <ActionButton onClick={() => hugNode(node.id)} title="너비/높이를 auto 로">
            <Icon name="hug" /> 내용 맞춤
          </ActionButton>
          <ActionButton onClick={() => fillParent(node.id)} title="부모 flex 방향에 맞춰 채움">
            <Icon name="fill" /> 부모 채우기
          </ActionButton>
        </div>
      )}

      {/* Frame — 자식 배치 액션 */}
      {isFrame && (
        <>
          <div className="grid grid-cols-2 gap-1">
            <ActionButton
              onClick={() => distributeChildrenEvenly(node.id)}
              title="justifyContent: space-between"
            >
              <Icon name="distribute" /> 균등 분배
            </ActionButton>
            <ActionButton
              onClick={() => stretchChildren(node.id)}
              title="alignItems: stretch (교차축 채움)"
            >
              <Icon name="stretch" /> 자식 늘이기
            </ActionButton>
            <ActionButton
              onClick={() => centerAll(node.id)}
              title="양축 모두 가운데"
            >
              <Icon name="center" /> 전체 가운데
            </ActionButton>
            <ActionButton
              onClick={() => fillChildrenMainAxis(node.id)}
              title="모든 자식에 flexGrow:1 부여"
            >
              <Icon name="fillChildren" /> 자식 채움
            </ActionButton>
          </div>
          <button
            type="button"
            onClick={() => smartResetFrame(node.id)}
            title="자식 구성을 보고 합리적 기본값으로 재설정"
            className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] text-indigo-700 hover:bg-indigo-100"
          >
            <span>✨</span> 추천 리셋
          </button>
        </>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center justify-start gap-1.5 rounded border border-neutral-300 bg-white px-2 py-1.5 text-[11px] text-neutral-700 hover:border-indigo-300 hover:bg-indigo-50"
    >
      {children}
    </button>
  );
}

/** 16x16 SVG 아이콘 — 액션을 시각적으로 구분. */
function Icon({ name }: { name: string }) {
  const stroke = "currentColor";
  switch (name) {
    case "hug":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="4" y="4" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="1.2" />
          <path d="M2 4v8M14 4v8" stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );
    case "fill":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={stroke} strokeWidth="1.2" />
          <rect x="3" y="5" width="10" height="6" rx="0.8" fill={stroke} opacity="0.25" />
        </svg>
      );
    case "distribute":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="6" width="3" height="4" rx="0.6" fill={stroke} />
          <rect x="6.5" y="6" width="3" height="4" rx="0.6" fill={stroke} />
          <rect x="12" y="6" width="3" height="4" rx="0.6" fill={stroke} />
        </svg>
      );
    case "stretch":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="3" height="12" rx="0.6" fill={stroke} />
          <rect x="6.5" y="2" width="3" height="12" rx="0.6" fill={stroke} />
          <rect x="11" y="2" width="3" height="12" rx="0.6" fill={stroke} />
        </svg>
      );
    case "center":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="1.5" stroke={stroke} strokeWidth="1.2" />
          <circle cx="8" cy="8" r="2" fill={stroke} />
        </svg>
      );
    case "fillChildren":
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="4" width="14" height="8" rx="1" stroke={stroke} strokeWidth="1.2" />
          <rect x="2.5" y="5.5" width="5.5" height="5" fill={stroke} opacity="0.3" />
          <rect x="8" y="5.5" width="5.5" height="5" fill={stroke} opacity="0.3" />
        </svg>
      );
    default:
      return null;
  }
}
