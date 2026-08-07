import Link from "next/link";

import { chartShell, chartWell } from "./revenue-chart-style";
import type { RevenueAggregatePoint, RevenuePointState } from "../../lib/revenue-aggregate";

const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

/** 축 눈금은 원장이 읽는 단위로. 억 · 만 · 원 순서로 내려간다. */
function tick(value: number) {
  if (value === 0) return "0";
  if (value >= 100_000_000) return `${Math.round(value / 10_000_000) / 10}억`;
  return value >= 10_000 ? `${Math.round(value / 10_000).toLocaleString("ko-KR")}만` : value.toLocaleString("ko-KR");
}

/** §18 — 상태별 사람이 읽는 설명. 실제 0원과 데이터 없음을 절대 같은 말로 쓰지 않는다. */
const stateText: Record<RevenuePointState, string> = {
  actual: "",
  zero: "매출 없음",
  missing: "집계 안 됨",
  future: "아직 오지 않은 기간",
  "in-progress": "진행 중",
  error: "집계 오류",
};

/** 말풍선이 카드 밖으로 새지 않게 앞·중간·뒤 세 구간으로 정렬을 바꾼다. */
function tooltipAlign(index: number, length: number) {
  if (index < length / 3) return "left-0";
  if (index > (length * 2) / 3) return "right-0";
  return "left-1/2 -translate-x-1/2";
}

function Delta({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="whitespace-nowrap">
      {label}{" "}
      {value === null ? (
        <span>–</span>
      ) : (
        <strong className={`font-mono tabular-nums ${value < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {value > 0 ? "+" : ""}
          {value}%
        </strong>
      )}
    </span>
  );
}

/**
 * 월별(§11.1)과 연도별(§11.3) 공용 막대 차트.
 * 축은 호출자가 정해 넘긴다 — 이 컴포넌트는 순서를 절대 금액순으로 바꾸지 않는다.
 */
export function RevenueBarChart({
  title,
  label,
  points,
  total,
  count,
  previousLabel,
  yearOverYearLabel,
  drilldownHref,
  emptyText,
}: {
  title: string;
  /** `2026년` 처럼 차트 전체가 덮는 기간. */
  label: string;
  points: readonly RevenueAggregatePoint[];
  /** 서버 집계 총액. 막대 합계와 반드시 같아야 한다 (§14). */
  total: number;
  count: number;
  /** 직전 구간 증감 라벨 — 월별은 `전월`, 연도별은 `전년`. */
  previousLabel: string;
  /** 넘기지 않으면 전년 대비를 숨긴다 (연도별은 직전 구간이 곧 전년이라 중복). */
  yearOverYearLabel?: string;
  /** 막대를 누르면 한 단계 아래 기간으로 내려가는 링크. */
  drilldownHref: (key: string) => string;
  emptyText: string;
}) {
  const max = Math.max(0, ...points.map((point) => point.gross ?? 0));
  const summed = points.reduce((running, point) => running + (point.gross ?? 0), 0);
  const mismatch = summed !== total;
  const recent = points.filter((point) => point.state === "actual" || point.state === "in-progress").slice(-3);
  const inProgress = points.some((point) => point.state === "in-progress");
  const hasFuture = points.some((point) => point.state === "future");

  return (
    <section className={chartShell}>
      <header className="px-5 pb-4 pt-[18px]">
        <h2 className="text-[10px] font-semibold tracking-[0.04em] text-[var(--muted)]">{title}</h2>
        <p className="mt-[9px] flex items-baseline gap-3">
          <strong className="font-mono text-[22px] font-semibold leading-none tracking-[-0.015em] tabular-nums">{won(total)}</strong>
          <span className="text-[12px] text-[var(--muted)]">
            {label} · {count.toLocaleString("ko-KR")}건
          </span>
        </p>
      </header>
      {mismatch && (
        <p className="mx-5 mb-3 rounded-[var(--radius-control)] border border-[var(--danger)] px-3 py-2 text-[12px] text-[var(--danger)]" role="alert">
          집계 오류: 막대 합계 {won(summed)}가 기간 총액 {won(total)}과 다릅니다.
        </p>
      )}
      {points.length === 0 ? (
        <p className="border-t border-[var(--border)] px-5 py-12 text-center text-[12px] text-[var(--muted)]">{emptyText}</p>
      ) : (
        <div className="border-t border-[var(--border)] px-4 pb-3 pt-4">
          <div className={`flex gap-3 ${chartWell} px-4 pb-3 pt-4`}>
            <div className="flex w-[48px] shrink-0 flex-col justify-between py-[1px] text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">
              {max > 0 ? (
                <>
                  <span>{tick(max)}</span>
                  <span>{tick(Math.round(max / 2))}</span>
                  <span>0</span>
                </>
              ) : (
                <span className="mt-auto">0</span>
              )}
            </div>
            <ol className="relative flex min-w-0 flex-1 items-stretch gap-[3px]" style={{ height: "196px" }}>
              {/* 눈금선은 막대 뒤로 물러난다. 데이터가 앞이다. */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-[var(--border)]" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--border)]" />
              {points.map((point, index) => {
                const interactive = point.gross !== null;
                // 0원 막대는 높이 0으로 두고, 값이 있는 막대는 최소 2px 남겨 눈에 보이게 한다.
                const height = max > 0 && point.gross ? Math.max((point.gross / max) * 100, 1.5) : 0;
                const body = (
                  <>
                    <span className="relative flex min-h-0 flex-1 items-end justify-center">
                      {interactive && point.gross ? (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] leading-tight opacity-0 shadow-[0_8px_24px_-10px_rgba(13,21,18,0.45)] transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipAlign(index, points.length)}`}
                          // 높은 막대 위에 띄우면 말풍선이 플롯 밖으로 나가 헤더를 덮는다. 그럴 땐 막대 안쪽으로 내린다.
                          style={height > 62 ? { top: `calc(${100 - height}% + 6px)` } : { bottom: `calc(${height}% + 6px)` }}
                        >
                          <span className="block text-[var(--muted)]">{point.key}</span>
                          <strong className="mt-[2px] block font-mono tabular-nums">{won(point.gross)}</strong>
                        </span>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className={`w-full origin-bottom rounded-t-[var(--radius-chip)] transition-[filter,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          point.state === "in-progress"
                            ? "border border-b-0 border-dashed border-[var(--accent)] bg-[var(--brand-soft)]"
                            : point.hasCorrection
                              ? "bg-[linear-gradient(180deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_72%,var(--surface))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                              : "bg-[linear-gradient(180deg,var(--brand)_0%,color-mix(in_srgb,var(--brand)_74%,var(--surface))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </span>
                    <span
                      className={`mt-[6px] block truncate text-center text-[11px] tabular-nums ${
                        point.state === "in-progress" ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {point.label}
                    </span>
                  </>
                );
                const shell =
                  "group relative flex h-full min-w-0 flex-1 flex-col rounded-[var(--radius-chip)] px-[1px] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]";
                return (
                  <li className="flex min-w-0 flex-1" key={point.key}>
                    {interactive ? (
                      <Link
                        aria-label={`${point.label} ${won(point.gross ?? 0)}${stateText[point.state] ? `, ${stateText[point.state]}` : ""}. 자세히 보기`}
                        className={`${shell} hover:bg-[var(--brand-soft)]/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]`}
                        data-revenue-bar={point.key}
                        data-revenue-bar-state={point.state}
                        href={drilldownHref(point.key)}
                      >
                        {body}
                      </Link>
                    ) : (
                      <span className={shell} data-revenue-bar={point.key} data-revenue-bar-state={point.state}>
                        {body}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
      <table className="sr-only">
        <caption>{`${label} ${title} 표`}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th>{point.key}</th>
              <td>{point.gross === null ? stateText[point.state] : `${won(point.gross)}${stateText[point.state] ? ` (${stateText[point.state]})` : ""}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recent.length > 0 && (
        <div className="mt-auto border-t border-[var(--border)] px-5 py-3">
          <ol className="flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-[var(--muted)]">
            {recent.map((point) => (
              <li className="flex gap-2.5" key={point.key}>
                <span className="font-medium text-[var(--foreground)]">{point.label}</span>
                <Delta label={previousLabel} value={point.deltaPrevious} />
                {yearOverYearLabel && <Delta label={yearOverYearLabel} value={point.deltaYearOverYear} />}
              </li>
            ))}
          </ol>
          {/* 아직 끝나지 않은 기간을 지난 기간 전체와 비교하면 항상 큰 폭 감소로 보인다. 비교 대상을 밝힌다. */}
          {(inProgress || hasFuture) && (
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              {inProgress ? `점선 칸은 진행 중인 기간이라 지난 기간 전체와 비교됩니다. ` : ""}
              {hasFuture ? "빈 칸은 아직 오지 않은 기간입니다." : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
