import { describe, expect, it } from "vitest";

import { displayStatus, minutesOfDay, railHeight, railHourMarks, railOffset, railTotalHeight } from "./day-rail";

describe("minutesOfDay", () => {
  it("시각 문자열과 ISO 문자열을 모두 읽는다", () => {
    expect(minutesOfDay("09:30")).toBe(570);
    expect(minutesOfDay("2026-08-06T14:20:00.000Z")).toBe(860);
  });

  it("형식이 어긋나면 null", () => {
    expect(minutesOfDay("")).toBeNull();
    expect(minutesOfDay("24:00")).toBeNull();
    expect(minutesOfDay("날짜 없음")).toBeNull();
  });
});

describe("rail geometry", () => {
  it("Figma 3:77 기하와 맞는다 — 시간당 52px, 상단 여백 8px", () => {
    expect(railOffset(540, 540)).toBe(8);
    expect(railOffset(600, 540)).toBe(60);
    expect(railOffset(1200, 540)).toBe(580);
  });

  it("영업 시작 이전은 레일 밖으로 나가지 않는다", () => {
    expect(railOffset(480, 540)).toBe(8);
  });

  it("카드 높이는 시술 시간에 비례하고 24px 하한을 지킨다", () => {
    expect(railHeight(60)).toBe(52);
    expect(railHeight(90)).toBe(78);
    expect(railHeight(5)).toBe(24);
  });

  it("레일 총 높이는 영업 시간을 담는다", () => {
    expect(railTotalHeight(540, 1200)).toBe(588);
  });

  it("정시 눈금은 영업 시간 안에만 놓인다", () => {
    const marks = railHourMarks(570, 690);
    expect(marks.map((mark) => mark.label)).toEqual(["10:00", "11:00"]);
    expect(marks[0].top).toBe(railOffset(600, 570));
  });
});

describe("displayStatus", () => {
  it("현재 시각이 예약 구간 안이면 진행중으로 파생된다", () => {
    expect(displayStatus("confirmed", 540, 600, 570)).toBe("in-progress");
  });

  it("구간 경계는 시작 포함, 종료 제외", () => {
    expect(displayStatus("confirmed", 540, 600, 540)).toBe("in-progress");
    expect(displayStatus("confirmed", 540, 600, 600)).toBe("confirmed");
  });

  it("저장된 종결 상태는 진행중으로 덮이지 않는다", () => {
    expect(displayStatus("completed", 540, 600, 570)).toBe("completed");
    expect(displayStatus("cancelled", 540, 600, 570)).toBe("cancelled");
  });

  it("시각을 모르면 저장된 상태를 그대로 쓴다", () => {
    expect(displayStatus("confirmed", null, null, null)).toBe("confirmed");
    expect(displayStatus("waiting", 540, 600, 570)).toBe("waiting");
  });
});
