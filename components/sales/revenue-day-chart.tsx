import Link from "next/link";

import { chartShell, chartWell } from "./revenue-chart-style";
import type { RevenueAggregatePoint, RevenuePointState } from "../../lib/revenue-aggregate";
import { typeScale } from "../type";

const won = (value: number) => `₩${value.toLocaleString("ko-KR")}`;

/** 축 눈금은 만원 단위가 사용자가 읽는 단위다. 1만원 미만이면 원 그대로. */
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
  comparisonNote,
  deltaPrevious,
  span = "month",
  title = "일별 매출",
  dividers,
  footNote,
  contextNote,
  controls,
  periodNote,
  transactionsHref,
}: {
  /** `2026년 8월` */
  label: string;
  points: readonly RevenueAggregatePoint[];
  /** 서버 집계 총액. 점 합계와 반드시 같아야 한다 (§14). */
  total: number;
  count: number;
  /** 진행 중인 기간을 잘라 견줬을 때 며칠까지인지. 끝난 기간이면 없다. */
  comparisonNote?: string;
  deltaPrevious: number | null;
  /** 창의 크기. `month` 는 28~31칸(일별), `year` 는 52~53칸(주별)이다. */
  span?: "month" | "year";
  /** 카드 제목. 예전에는 `일별 매출` 이 박혀 있어 주별을 그려도 일별이라 말했다. */
  title?: string;
  /** 점선 세로 구분선을 그을 칸 번호. 주별에서 달이 바뀌는 자리다. */
  dividers?: readonly number[];
  /** 차트 아래 한 줄. 주별의 연 경계 주 규칙처럼 그림이 못 말하는 것만 쓴다. */
  footNote?: string;
  /** 고른 기간과 그린 기간이 다를 때만 밝힌다. */
  contextNote?: string;
  /** 기간 칩 4개와 이동 화살표. 없어진 매출 조회 박스 대신 이 카드 머리줄이 기간을 고른다. */
  controls?: React.ReactNode;
  /** `2026-08-01 ~ 2026-08-31`. 칩이 고른 기간을 날짜로 확인시킨다. */
  periodNote?: string;
  /** 날짜를 붙이면 그 날 거래 목록이 되는 링크 접두사. */
  transactionsHref: (dateKey: string) => string;
}) {
  const max = Math.max(0, ...points.map((point) => point.gross ?? 0));
  const drawn = points.filter((point) => point.gross !== null);
  // 막대 폭 상한은 칸 수에 따라 다르다. 31칸이면 18px, 53칸이면 16px 를 넘지 않는다.
  const barWidth = span === "year" ? "max-w-[16px]" : "max-w-[18px]";
  const summed = drawn.reduce((running, point) => running + (point.gross ?? 0), 0);
  const mismatch = summed !== total;
  // 아직 끝나지 않은 달을 지난 달 전체와 비교하면 항상 큰 폭 감소로 보인다. 비교 대상을 라벨에 밝힌다.
  const partial = points.some((point) => point.state === "future" || point.state === "in-progress");
  // 범례는 화면에 있는 것만 설명한다. 골드가 하나도 없는 달에 "금색은…"을 남기면 찾을 수 없는 색을 찾게 만든다.
  const hasGold = points.some((point) => point.hasCorrection || point.state === "in-progress");

  return (
    <section className={chartShell}>
      <header className="flex items-start justify-between gap-6 px-5 pb-4 pt-[18px]">
        <div>
          <h2
            className={`${typeScale.micro} text-[var(--muted)]`}
            id="revenue-day-chart-title"
          >
            {title}
          </h2>
          <p className="mt-[9px] flex items-baseline gap-3">
            <strong className={`font-mono ${typeScale.metric} tabular-nums`}>{won(total)}</strong>
            <span className="text-[12px] text-[var(--muted)]">
              {label} · {count.toLocaleString("ko-KR")}건
            </span>
          </p>
          {/* 기간 표시는 칩 옆이 아니라 제목 아래 작은 글씨다 — 고른 결과지 조작기가 아니다. */}
          {periodNote && <p className="mt-[7px] font-mono text-[11px] tabular-nums text-[var(--muted)]">{periodNote}</p>}
          {/* 하루를 고르면 막대가 한 개라 비교가 안 된다. 그래서 그 날이 든 달을 그리는데, 왜 넓혔는지 밝힌다. */}
          {contextNote && <p className="mt-[7px] text-[12px] text-[var(--muted)]">{contextNote}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          {controls}
          <p className="text-right text-[12px] text-[var(--muted)]">
            {span === "year" ? "전년" : "전월"} 대비{" "}
            {deltaPrevious === null ? (
              <span>비교 불가</span>
            ) : (
              <strong className={`font-mono tabular-nums ${deltaPrevious < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                {deltaPrevious > 0 ? "+" : ""}
                {deltaPrevious}%
              </strong>
            )}
            {comparisonNote && <span className="mt-[3px] block text-[11px]">지난 {span === "year" ? "해" : "달"} 같은 기간({comparisonNote})과 견줬습니다</span>}
          </p>
        </div>
      </header>
      {mismatch && (
        <p className="mx-5 mb-3 rounded-[var(--radius-control)] border border-[var(--danger)] px-3 py-2 text-[12px] text-[var(--danger)]" role="alert">
          집계 오류: 일별 합계 {won(summed)}가 기간 총액 {won(total)}과 다릅니다.
        </p>
      )}
      <div className="border-t border-[var(--border)] px-4 pb-3 pt-4">
        {/* 날짜 눈금은 플롯 아래 18px 자리에 절대 위치한다. 우물 아래 여백이 그보다 작으면
            눈금 숫자만 우물 밖 흰 바닥으로 떨어져 축이 차트에서 떨어져 나온 것처럼 보인다. */}
        <div className={`flex gap-3 ${chartWell} px-4 pb-6 pt-4`}>
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
            {/* 눈금선은 막대 뒤로 물러난다. 데이터가 앞이다. */}
            {[0, 50].map((offset) => (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--border)]"
                key={offset}
                style={{ top: `${offset}%` }}
              />
            ))}
            {/* 달이 바뀌는 자리. 53칸에서는 주차 숫자만으로 계절을 못 읽어서 달 경계를 긋는다. */}
            {dividers?.map((index) => (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 top-0 border-l border-dashed border-[var(--border)]"
                key={`divider-${index}`}
                style={{ left: `${(index / points.length) * 100}%` }}
              />
            ))}
            {points.map((point, index) => {
              const interactive = point.gross !== null;
              // 0원인 날은 높이 0으로 비워 둔다 — 막대가 없는 것 자체가 "매출 없음"이다.
              // 값이 있으면 최소 1.5%를 남겨 아주 작은 날도 눈에 걸린다.
              const height = max > 0 && point.gross ? Math.max(ratio(point.gross, max), 1.5) : 0;
              const dot = (
                <>
                  {point.state === "in-progress" && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-1/2 top-0 w-px bg-[var(--accent)]"
                    />
                  )}
                  {height > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-1/2 w-[calc(100%-3px)] ${barWidth} -translate-x-1/2 origin-bottom rounded-t-[var(--radius-chip)] transition-[filter,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        point.hasCorrection
                          ? "bg-[linear-gradient(180deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_72%,var(--surface))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                          : point.state === "in-progress"
                            ? "border border-b-0 border-dashed border-[var(--accent)] bg-[var(--brand-soft)]"
                            : "bg-[linear-gradient(180deg,var(--brand)_0%,color-mix(in_srgb,var(--brand)_74%,var(--surface))_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                      }`}
                      data-revenue-draw
                      style={{ height: `${height}%` }}
                    />
                  )}
                  {/* 실제 0원인 날은 바닥에 눈금 하나를 남긴다. 아직 오지 않은 날(빈 칸)과 구분된다 (§18).
                      `--border` 로 그리면 우물 배경 위에서 1.1:1 이라 사실상 안 보였다(실측).
                      이 눈금은 장식이 아니라 상태 정보이므로 비텍스트 대비 3:1 을 넘겨야 한다. */}
                  {point.state === "zero" && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-1/2 h-[2px] w-[calc(100%-3px)] ${barWidth} -translate-x-1/2 rounded-full bg-[var(--muted)]`}
                    />
                  )}
                  {interactive && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] leading-tight opacity-0 shadow-[0_8px_24px_-10px_rgba(13,21,18,0.45)] transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipAlign(index, points.length)}`}
                      // 높은 막대 위에 띄우면 말풍선이 플롯 밖으로 나가 헤더를 덮는다. 그럴 땐 막대 안쪽으로 내린다.
                      style={height > 62 ? { top: `calc(${100 - height}% + 6px)` } : { bottom: `calc(${height}% + 6px)` }}
                    >
                      <span className="block text-[var(--muted)]">{point.key}</span>
                      <strong className="mt-[2px] block font-mono tabular-nums">{won(point.gross ?? 0)}</strong>
                    </span>
                  )}
                  {/* 눈금·기준선은 칸 안에 있으므로 칸의 절반이 곧 막대 중심이다.
                      플롯 기준 좌표(`x(index)`)를 쓰면 칸 안에서 다시 그만큼 밀려
                      31칸에서는 티가 안 나던 어긋남이 7칸에서 한 칸만큼 벌어졌다. */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-[-18px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums ${
                      point.state === "in-progress" ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {/* 주차 라벨은 `1주차` 라 숫자로 못 읽는다. 자리 번호로 5칸마다 하나만 남긴다. */}
                    {(span === "year" ? index % 5 === 0 : Number(point.label) % 5 === 0 || Number(point.label) === 1) ? point.label : ""}
                  </span>
                </>
              );
              const column = `group absolute bottom-0 top-0 rounded-[var(--radius-chip)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${interactive ? "hover:bg-[var(--brand-soft)]/60" : ""}`;
              const style = { left: `${(index / points.length) * 100}%`, width: `${100 / points.length}%` };
              return interactive ? (
                <Link
                  aria-label={`${point.label}${span === "year" ? "" : "일"} ${won(point.gross ?? 0)}${stateText[point.state] ? `, ${stateText[point.state]}` : ""}. 거래 목록 보기`}
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
        <caption>{label} {title} 표</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th>{point.key}</th>
              <td>{point.gross === null ? stateText[point.state] : `${won(point.gross)}${stateText[point.state] ? ` (${stateText[point.state]})` : ""}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-5 pb-4 pt-[22px] text-[12px] text-[var(--muted)]">
        바닥 눈금만 있는 칸은 매출이 없던 {span === "year" ? "주" : "날"}{partial ? `, 아무 표시도 없는 칸은 아직 오지 않은 ${span === "year" ? "주" : "날"}` : ""}입니다.
        {hasGold ? " 금색은 오늘과 정정 기록을 뜻합니다." : ""}
        {footNote ? ` ${footNote}` : ""}
      </p>
    </section>
  );
}
