import { describe, expect, it } from "vitest";

import { seoulBusinessDate, seoulClock, seoulClockOrEmpty, seoulInstant } from "./seoul-date";

describe("seoul instant convention", () => {
  it("stamps Seoul wall-clock as a true instant", () => {
    expect(seoulInstant("2026-08-04", "10:00")).toBe("2026-08-04T01:00:00.000Z");
    expect(seoulInstant("2026-08-04", "00:30")).toBe("2026-08-03T15:30:00.000Z");
  });

  it("round-trips back to the same wall clock", () => {
    for (const [date, time] of [["2026-08-04", "10:00"], ["2026-01-01", "00:00"], ["2026-12-31", "23:59"]] as const) {
      expect(seoulClock(seoulInstant(date, time))).toEqual({ date, time });
    }
  });

  it("keeps the Seoul business day equal to the UTC calendar date", () => {
    // 09:00 컷오프의 +9h 와 -1일이 상쇄된다. SQL `substr(occurred_at, 1, 10)` 이 곧 영업일인 근거.
    for (const [date, time] of [["2026-08-04", "09:00"], ["2026-08-04", "23:59"], ["2026-08-05", "00:00"], ["2026-08-05", "08:59"]] as const) {
      const at = seoulInstant(date, time);
      expect(seoulBusinessDate(at)).toBe(at.slice(0, 10));
    }
  });

  it("returns empty strings instead of throwing on missing or broken values", () => {
    expect(seoulClockOrEmpty("")).toEqual({ date: "", time: "" });
    expect(seoulClockOrEmpty("not-a-date")).toEqual({ date: "", time: "" });
  });

  it("rejects malformed input", () => {
    expect(() => seoulInstant("2026-13-40", "10:00")).toThrow();
  });
});
