import Link from "next/link";

import { chartShell, chartWell } from "./revenue-chart-style";
import type { RevenueAggregatePoint, RevenuePointState } from "../../lib/revenue-aggregate";

const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

/** 축 눈금은 만원 단위가 원장이 읽는 단위다. 1만원 미만이면 원 그대로. */
function tick(value: number) {
  if (value === 0) return "0";
  return value >= 10_000 ? `${Math.round(value / 10_000).toLocaleString("ko-KR")}만` : value.toLocaleString("ko-KR");
}

/** §18 — 상태별 사람이 읽는 설명. 실제 0원과 데이터 없음을 절대 같은 말로 쓰지 않는다. */
const stateText: Record<RevenuePointState, string> = {
  actual: "",
  zero: "매출 없음",
  missing: "집계 안 됨",
  future: "아직 오지 않은 날",
  "in-progress": "진행 중",
  error: "집계 오류",
};

function ratio(value: number, max: number) {
  return max > 0 ? (value / max) * 100 : 0;
}

/** 말풍선이 카드 밖으로 새지 않게 앞·중간·뒤 세 구간으로 정렬을 바꾼다. */
function tooltipAlign(index: number, length: number) {
  if (index < length / 3) return "left-0";
  if (index > (length * 2) / 3) return "right-0";
  return "left-1/2 -translate-x-1/2";
}

export function RevenueDayChart({
  label,
  points,
  total,
  count,
  deltaPrevious,
  transactionsHref,
}: {
  /** `2026년 8월` */
  label: string;
  points: readonly RevenueAggregatePoint[];
  /** 서버 집계 총액. 점 합계와 반드시 같아야 한다 (§14). */
  total: number;
  count: number;
  deltaPrevious: number | null;
  /** 날짜를 붙이면 그 날 거래 목록이 되는 링크 접두사. */
  transactionsHref: (dateKey: string) => string;
}) {
  const max = Math.max(0, ...points.map((point) => point.gross ?? 0));
  const drawn = points.filter((point) => point.gross !== null);
  const x = (index: number) => ((index + 0.5) / points.length) * 100;
  const drawnIndexes = points.map((point, index) => (point.gross === null ? null : index)).filter((index): index is number => index !== null);
  const line = drawnIndexes.map((index) => `${x(index)},${100 - ratio(points[index].gross ?? 0, max)}`).join(" ");
  // 면적은 선과 같은 점을 쓰되 양 끝을 바닥으로 내려 닫는다. 값이 아니라 추세의 무게를 보여주는 장치다.
  const area = line && drawnIndexes.length > 1 ? `${x(drawnIndexes[0])},100 ${line} ${x(drawnIndexes[drawnIndexes.length - 1])},100` : "";
  const summed = drawn.reduce((running, point) => running + (point.gross ?? 0), 0);
  const mismatch = summed !== total;
  // 아직 끝나지 않은 달을 지난 달 전체와 비교하면 항상 큰 폭 감소로 보인다. 비교 대상을 라벨에 밝힌다.
  const partial = points.some((point) => point.state === "future" || point.state === "in-progress");

  return (
    <section className={chartShell}>
      <header className="flex items-end justify-between gap-6 px-5 pb-4 pt-[18px]">
        <div>
          <h2
            className="text-[10px] font-semibold tracking-[0.04em] text-[var(--muted)]"
            id="revenue-day-chart-title"
          >
            일별 매출
          </h2>
          <p className="mt-[9px] flex items-baseline gap-3">
            <strong className="font-mono text-[26px] font-semibold leading-none tracking-[-0.015em] tabular-nums">{won(total)}</strong>
            <span className="text-[12px] text-[var(--muted)]">
              {label} · {count.toLocaleString("ko-KR")}건
            </span>
          </p>
        </div>
        <p className="text-right text-[12px] text-[var(--muted)]">
          전월 대비{" "}
          {deltaPrevious === null ? (
            <span>비교 불가</span>
          ) : (
            <strong className={`font-mono tabular-nums ${deltaPrevious < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              {deltaPrevious > 0 ? "+" : ""}
              {deltaPrevious}%
            </strong>
          )}
          {partial && <span className="mt-[3px] block text-[11px]">진행 중인 달이라 지난달 전체와 비교됩니다</span>}
        </p>
      </header>
      {mismatch && (
        <p className="mx-5 mb-3 rounded-[var(--radius-control)] border border-[var(--danger)] px-3 py-2 text-[12px] text-[var(--danger)]" role="alert">
          집계 오류: 일별 합계 {won(summed)}가 기간 총액 {won(total)}과 다릅니다.
        </p>
      )}
      <div className="border-t border-[var(--border)] px-4 pb-3 pt-4">
        <div className={`flex gap-3 ${chartWell} px-4 pb-2 pt-4`}>
          <div className="flex w-[52px] shrink-0 flex-col justify-between py-[2px] text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">
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
          <div className="relative min-w-0 flex-1" style={{ height: "196px" }}>
            <svg
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="revenue-day-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((offset) => (
                <line
                  key={offset}
                  stroke="var(--border)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  x1={0}
                  x2={100}
                  y1={offset}
                  y2={offset}
                />
              ))}
              {area && <polygon data-revenue-draw fill="url(#revenue-day-area)" points={area} />}
              {line && (
                <polyline
                  data-revenue-draw
                  fill="none"
                  points={line}
                  stroke="var(--brand)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {points.map((point, index) => {
              const interactive = point.gross !== null;
              const dot = (
                <>
                  {point.state === "in-progress" && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 top-0 w-px bg-[var(--accent)]"
                      style={{ left: `${x(index)}%` }}
                    />
                  )}
                  {interactive && (
                    <span
                      aria-hidden="true"
                      className={`absolute h-[8px] w-[8px] -translate-x-1/2 translate-y-1/2 rounded-full border transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.6] group-focus-visible:scale-[1.6] ${
                        point.hasCorrection
                          ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_2px_var(--surface)]"
                          : point.state === "in-progress"
                            ? "border-[var(--accent)] bg-[var(--surface)] shadow-[0_0_0_2px_var(--surface)]"
                            : point.state === "zero"
                              ? "border-[var(--border)] bg-[var(--surface)]"
                              : "border-[var(--brand)] bg-[var(--brand)] shadow-[0_0_0_2px_var(--surface)]"
                      }`}
                      style={{ left: `${x(index)}%`, bottom: `${ratio(point.gross ?? 0, max)}%` }}
                    />
                  )}
                  {interactive && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] leading-tight opacity-0 shadow-[0_8px_24px_-10px_rgba(13,21,18,0.45)] transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipAlign(index, points.length)}`}
                      // 높은 점 위에 띄우면 말풍선이 플롯 밖으로 나가 헤더를 덮는다. 그럴 땐 점 아래로 뒤집는다.
                      style={
                        ratio(point.gross ?? 0, max) > 62
                          ? { top: `calc(${100 - ratio(point.gross ?? 0, max)}% + 16px)` }
                          : { bottom: `calc(${ratio(point.gross ?? 0, max)}% + 16px)` }
                      }
                    >
                      <span className="block text-[var(--muted)]">{point.key}</span>
                      <strong className="mt-[2px] block font-mono tabular-nums">{won(point.gross ?? 0)}</strong>
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-[-18px] -translate-x-1/2 text-[10px] tabular-nums ${
                      point.state === "in-progress" ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
                    }`}
                    style={{ left: `${x(index)}%` }}
                  >
                    {Number(point.label) % 5 === 0 || Number(point.label) === 1 ? point.label : ""}
                  </span>
                </>
              );
              const column = `group absolute bottom-0 top-0 rounded-[var(--radius-chip)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${interactive ? "hover:bg-[var(--brand-soft)]/60" : ""}`;
              const style = { left: `${(index / points.length) * 100}%`, width: `${100 / points.length}%` };
              return interactive ? (
                <Link
                  aria-label={`${point.label}일 ${won(point.gross ?? 0)}${stateText[point.state] ? `, ${stateText[point.state]}` : ""}. 거래 목록 보기`}
                  className={`${column} focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--brand)]`}
                  data-revenue-day={point.key}
                  data-revenue-day-state={point.state}
                  href={transactionsHref(point.key)}
                  key={point.key}
                  style={style}
                >
                  {dot}
                </Link>
              ) : (
                <span className={column} data-revenue-day={point.key} data-revenue-day-state={point.state} key={point.key} style={style}>
                  {dot}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{label} 일별 매출 표</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th>{point.key}</th>
              <td>{point.gross === null ? stateText[point.state] : `${won(point.gross)}${stateText[point.state] ? ` (${stateText[point.state]})` : ""}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 pb-4 pt-[22px] text-[11.5px] text-[var(--muted)]">
        빈 점은 매출이 없던 날{partial ? ", 표시 없는 칸은 아직 오지 않은 날" : ""}입니다. 금색은 오늘과 정정 기록을 뜻합니다.
      </p>
    </section>
  );
}
