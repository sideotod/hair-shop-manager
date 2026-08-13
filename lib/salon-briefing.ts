import type { LedgerCustomerMix, LedgerHourRow, LedgerWeekdayRow } from "./salon-domain";
import type { RevenueSummary } from "./revenue-aggregate";

/**
 * 사용자가 읽는 것은 숫자가 아니라 문장이다 (브리핑형).
 * 여기서 만드는 값은 전부 서버 집계에서 나온 것만 쓴다 — 화면은 다시 합산하지 않는다 (§14).
 */

export type SalonBriefing = {
  /** 이 기간을 한 줄로. 비교 대상이 없으면 비교를 지어내지 않는다. */
  readonly headline: string;
  /** 근거 한 줄. 숫자가 어디서 나왔는지 밝힌다. */
  readonly evidence: string;
  readonly tone: "up" | "down" | "flat" | "unknown";
};

export type VisitPattern = {
  readonly label: string;
  readonly count: number;
  readonly gross: number;
  /** 가장 붐빈 칸 대비 0~1. 막대 길이가 곧 이 값이다. */
  readonly ratio: number;
  readonly busiest: boolean;
};

export type CustomerBriefing = LedgerCustomerMix & {
  readonly returning: number;
  /** 재방문 고객 **비중**. 코호트 재방문율이 아니다 — 이름을 섞지 않는다. */
  readonly returningShare: number | null;
  readonly visitsPerCustomer: number | null;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const won = (value: number) => `₩${Math.round(value).toLocaleString("ko-KR")}`;

/** 0~1 배율. 최소 2% 는 남겨 작은 값도 보이게 한다 — 다만 진짜 0은 0으로 남긴다. */
function ratioOf(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(value / max, 0.02);
}

/** 한글 조사. "금요일이" / "14시가" — 받침 유무로 갈린다. */
function subjectParticle(word: string) {
  const code = word.codePointAt(word.length - 1) ?? 0;
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return hangul && (code - 0xac00) % 28 !== 0 ? "이" : "가";
}

function pattern<T>(rows: readonly T[], label: (row: T) => string, count: (row: T) => number, gross: (row: T) => number): readonly VisitPattern[] {
  const max = Math.max(0, ...rows.map(count));
  return Object.freeze(rows.map((row) => Object.freeze({
    label: label(row),
    count: count(row),
    gross: gross(row),
    ratio: ratioOf(count(row), max),
    busiest: count(row) === max && max > 0,
  })));
}

/** 요일 축은 일~토 일곱 칸을 늘 그린다. 쉬는 날이 사라지면 "쉬는 날"이라는 사실도 사라진다. */
export function weekdayPattern(rows: readonly LedgerWeekdayRow[]): readonly VisitPattern[] {
  const byWeekday = new Map(rows.map((row) => [row.weekday, row]));
  const filled = WEEKDAYS.map((_, weekday) => byWeekday.get(weekday) ?? { weekday, gross: 0, count: 0 });
  return pattern(filled, (row) => WEEKDAYS[row.weekday], (row) => row.count, (row) => row.gross);
}

/** 시간대 축은 손님이 온 시간만 그린다. 영업시간을 알 수 없으므로 0시~23시를 지어내지 않는다. */
export function hourPattern(rows: readonly LedgerHourRow[]): readonly VisitPattern[] {
  return pattern(rows, (row) => `${row.hour}시`, (row) => row.count, (row) => row.gross);
}

/**
 * 시간대 분석을 보여도 되는가. **칸이 몇 개인지로는 알 수 없다.**
 *
 * 이관 자료는 원본에 시각이 없어 날짜만 읽고 정오로 채운다
 * (`scripts/import-hairnury-details.mjs:9`). 그런데도 시간대 분포는 생긴다 —
 * 실측하니 아홉 칸이 전부 279의 배수였고, 5,578행 중 5,577행의 분이 `:00` 이었다.
 * 손님이 온 시각이 아니라 가져오기가 만든 모양이다.
 *
 * 사람이 찍은 시각은 분이 흩어진다. 그것을 근거로 삼는다.
 * 실제 결제가 쌓이면 이 조건이 저절로 참이 되어 분석이 되살아난다.
 */
export function isUsableHourPattern(rows: readonly LedgerHourRow[]) {
  const live = rows.filter((row) => row.count > 0);
  return live.length > 1 && live.some((row) => row.minutes > 1);
}

export function customerBriefing(mix: LedgerCustomerMix): CustomerBriefing {
  const returning = Math.max(0, mix.customers - mix.newCustomers);
  return {
    ...mix,
    returning,
    returningShare: mix.customers > 0 ? Math.round((returning / mix.customers) * 100) : null,
    visitsPerCustomer: mix.customers > 0 ? Math.round((mix.visits / mix.customers) * 10) / 10 : null,
  };
}

/**
 * 객단가 — 손님 한 사람이 한 번 와서 쓰고 간 돈.
 *
 * 나누는 값은 **결제 건수가 아니라 방문 수**다. 한국에서 통용되는 정의가
 * "총 매출 ÷ 총 방문 고객 수"이고(고객수 × 객단가 × 방문횟수 = 매출),
 * 같은 손님이 같은 날 두 번 결제하면 결제는 둘이지만 쓰고 간 것은 한 번 몫이다.
 * 방문이 0이면 나누지 않는다.
 */
export function averageTicket(gross: number, visits: number) {
  return visits > 0 ? Math.round(gross / visits) : null;
}

/**
 * 기간 요약 한 문장. `deltaPrevious` 가 `null` 이면 — 직전 기간에 매출이 없었거나
 * 비교할 기간 자체가 없다는 뜻이다. 그럴 때 `+∞%` 를 찍지 않고 비교를 생략한다 (§18).
 *
 * `partialComparison` 은 아직 끝나지 않은 기간을 견줄 때 채운다. 8월 12일에 8월 전체를
 * 7월 **전체**와 견주면 언제나 "크게 줄었다"가 나온다 — 사실이 아니라 달력이 만든 착시다.
 * 그래서 지난달도 같은 날짜까지만 잘라 견주고, 그렇게 했다는 것을 문장이 밝힌다.
 */
export function revenueBriefing(summary: RevenueSummary, previousLabel: string, options: { inclusiveEnd?: string; partialComparison?: string } = {}): SalonBriefing {
  const end = options.inclusiveEnd ?? summary.period.endExclusive;
  const evidence = `${summary.period.start} ~ ${end} 결제 ${summary.count.toLocaleString("ko-KR")}건 · 총 매출 ${won(summary.gross)}`;
  if (summary.count === 0) return { headline: "이 기간에는 결제 기록이 없습니다.", evidence, tone: "unknown" };
  if (summary.deltaPrevious === null) return { headline: `${won(summary.gross)} 벌었습니다. ${previousLabel}에 견줄 기록이 없어 증감은 표시하지 않습니다.`, evidence, tone: "unknown" };

  // 같은 날짜까지 잘라 견줬으면 그 사실을 비교 대상 이름에 붙인다.
  const against = options.partialComparison ? `${previousLabel} 같은 기간(${options.partialComparison})` : previousLabel;
  const change = Math.abs(summary.deltaPrevious);
  if (change < 1) return { headline: `${won(summary.gross)} 으로 ${against}과 거의 같습니다.`, evidence, tone: "flat" };
  const direction = summary.deltaPrevious > 0 ? "늘었습니다" : "줄었습니다";
  return { headline: `${won(summary.gross)}, ${against}보다 ${change}% ${direction}.`, evidence, tone: summary.deltaPrevious > 0 ? "up" : "down" };
}

/** 붐빈 요일/시간 한 문장. 표를 읽지 않아도 답이 보이게 한다. */
export function patternHeadline(rows: readonly VisitPattern[], unit: "요일" | "시간대") {
  const busiest = rows.find((row) => row.busiest);
  if (!busiest || busiest.count === 0) return `${unit}별로 나눌 방문 기록이 없습니다.`;
  const quiet = rows.filter((row) => row.count === 0).map((row) => row.label);
  const closed = unit === "요일" && quiet.length > 0 ? ` ${quiet.join("·")}요일은 방문이 없습니다.` : "";
  const subject = unit === "요일" ? `${busiest.label}요일` : busiest.label;
  return `${subject}${subjectParticle(subject)} 가장 붐빕니다 — ${busiest.count}건.${closed}`;
}
