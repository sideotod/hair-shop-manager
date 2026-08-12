import { describe, expect, it } from "vitest";

import { averageTicket, customerBriefing, hourPattern, patternHeadline, revenueBriefing, weekdayPattern } from "./salon-briefing";
import type { RevenueSummary } from "./revenue-aggregate";

const summary = (over: Partial<RevenueSummary> = {}): RevenueSummary => ({
  period: { start: "2026-07-01", endExclusive: "2026-08-01", label: "2026년 7월" },
  gross: 3262000, discount: 0, points: 0, netPaid: 3262000, refunds: 0,
  vat: 0, fee: 84000, expense: 0, profit: 3178000, count: 89, deltaPrevious: 12.5,
  ...over,
});

describe("revenueBriefing", () => {
  it("compares, explains, and cites evidence", () => {
    const brief = revenueBriefing(summary(), "지난달");
    expect(brief.headline).toBe("₩3,262,000, 지난달보다 12.5% 늘었습니다.");
    expect(brief.evidence).toContain("결제 89건");
    expect(brief.tone).toBe("up");
  });

  /** 직전 기간이 ₩0 이면 증감률은 무한대가 된다. 숫자를 지어내는 대신 비교를 접는다. */
  it("never invents a comparison when the previous period has none", () => {
    const brief = revenueBriefing(summary({ deltaPrevious: null }), "지난달");
    expect(brief.headline).toContain("견줄 기록이 없어");
    expect(brief.headline).not.toContain("%");
    expect(brief.tone).toBe("unknown");
  });

  it("says nothing happened rather than ₩0 grew", () => {
    expect(revenueBriefing(summary({ count: 0, gross: 0, deltaPrevious: null }), "지난달").headline).toBe("이 기간에는 결제 기록이 없습니다.");
  });

  /** 8월 12일에 8월 전체를 7월 전체와 견주면 언제나 "줄었다"가 나온다. 달력이 만든 착시다. */
  it("refuses to compare a period that has not finished", () => {
    const brief = revenueBriefing(summary({ gross: 362000, count: 11, deltaPrevious: -88.9 }), "지난달", { inProgress: true });
    expect(brief.headline).toContain("아직 진행 중인 기간이라");
    expect(brief.headline).not.toContain("88.9");
    expect(brief.tone).toBe("unknown");
  });

  /** 근거 줄은 화면이 보여주는 기간과 같아야 한다. 반열린 끝(9월 1일)을 그대로 쓰면 하루가 늘어 보인다. */
  it("cites the inclusive end the screen shows", () => {
    expect(revenueBriefing(summary(), "지난달", { inclusiveEnd: "2026-07-31" }).evidence).toContain("2026-07-01 ~ 2026-07-31");
  });

  it("calls a sub-1% move flat instead of a trend", () => {
    expect(revenueBriefing(summary({ deltaPrevious: 0.4 }), "지난달").tone).toBe("flat");
  });
});

describe("visit patterns", () => {
  /** 화요일이 통째로 빠져도 축은 일곱 칸이다 — 빈 칸이 곧 "쉬는 날"이라는 정보다. */
  it("always draws seven weekdays and names the closed ones", () => {
    const rows = weekdayPattern([
      { weekday: 0, gross: 390000, count: 10 }, { weekday: 1, gross: 330000, count: 7 },
      { weekday: 3, gross: 572000, count: 16 }, { weekday: 4, gross: 348000, count: 12 },
      { weekday: 5, gross: 804000, count: 23 }, { weekday: 6, gross: 818000, count: 21 },
    ]);
    expect(rows).toHaveLength(7);
    expect(rows[2]).toMatchObject({ label: "화", count: 0, ratio: 0 });
    expect(rows.find((row) => row.busiest)?.label).toBe("금");
    expect(patternHeadline(rows, "요일")).toBe("금요일이 가장 붐빕니다 — 23건. 화요일은 방문이 없습니다.");
  });

  it("draws only the hours that had visits", () => {
    const rows = hourPattern([{ hour: 11, gross: 120000, count: 3 }, { hour: 14, gross: 400000, count: 9 }]);
    expect(rows.map((row) => row.label)).toEqual(["11시", "14시"]);
    expect(rows[0].ratio).toBeCloseTo(1 / 3);
    expect(patternHeadline(rows, "시간대")).toBe("14시가 가장 붐빕니다 — 9건.");
  });

  it("reports empty patterns instead of dividing by zero", () => {
    expect(weekdayPattern([]).every((row) => row.ratio === 0)).toBe(true);
    expect(patternHeadline(hourPattern([]), "시간대")).toBe("시간대별로 나눌 방문 기록이 없습니다.");
  });
});

describe("customerBriefing", () => {
  /** 신규는 원장 전체에서 처음 온 사람이다. 재방문은 나머지 — 코호트 재방문"율"이 아니다. */
  it("splits visitors into new and returning without claiming a cohort rate", () => {
    const brief = customerBriefing({ visits: 89, customers: 72, newCustomers: 4 });
    expect(brief).toMatchObject({ returning: 68, returningShare: 94, visitsPerCustomer: 1.2 });
  });

  it("returns null instead of NaN when nobody came", () => {
    expect(customerBriefing({ visits: 0, customers: 0, newCustomers: 0 })).toMatchObject({ returningShare: null, visitsPerCustomer: null });
    expect(averageTicket(0, 0)).toBeNull();
    expect(averageTicket(3262000, 89)).toBe(36652);
  });
});
