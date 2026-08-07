/** Figma Proposal B `3:77` 하루 축 기하: 가로선 간격 52px = 1시간, 레일 상단 여백 8px. */
export const RAIL_HOUR_HEIGHT = 52;
export const RAIL_TOP_PADDING = 8;

const timeOfDay = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "09:30" 또는 ISO 문자열에서 자정 기준 분. 파싱 실패 시 null. */
export function minutesOfDay(value: string) {
  const clock = timeOfDay.exec(value) ?? timeOfDay.exec(value.slice(11, 16));
  if (!clock) return null;
  return Number(clock[1]) * 60 + Number(clock[2]);
}

/** 자정 기준 분을 레일 상단 기준 px로. 영업 시작 이전 값은 0으로 고정. */
export function railOffset(minutes: number, openMinutes: number) {
  return RAIL_TOP_PADDING + Math.max(0, minutes - openMinutes) * RAIL_HOUR_HEIGHT / 60;
}

/** 시술 시간(분)을 카드 높이 px로. 최소 24px는 라벨 한 줄이 들어가는 하한. */
export function railHeight(durationMinutes: number) {
  return Math.max(24, durationMinutes * RAIL_HOUR_HEIGHT / 60);
}

/** 영업 시작~종료를 담는 레일 총 높이. */
export function railTotalHeight(openMinutes: number, closeMinutes: number) {
  return RAIL_TOP_PADDING * 2 + Math.max(0, closeMinutes - openMinutes) * RAIL_HOUR_HEIGHT / 60;
}

/** 영업 시간 사이의 정시 눈금 목록. */
export function railHourMarks(openMinutes: number, closeMinutes: number) {
  const marks: { hour: number; label: string; top: number }[] = [];
  for (let hour = Math.ceil(openMinutes / 60); hour * 60 <= closeMinutes; hour += 1) {
    marks.push({ hour, label: `${String(hour).padStart(2, "0")}:00`, top: railOffset(hour * 60, openMinutes) });
  }
  return marks;
}

export type BookingStatus = "confirmed" | "waiting" | "completed" | "cancelled" | "in-progress";

/**
 * 저장된 상태 + 현재 시각으로 표시 상태를 정한다.
 * 진행중은 저장되는 값이 아니라 지금이 예약 구간 안일 때 파생되는 상태다.
 */
export function displayStatus(status: string, startMinutes: number | null, endMinutes: number | null, nowMinutes: number | null): BookingStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "confirmed" && nowMinutes !== null && startMinutes !== null && endMinutes !== null && nowMinutes >= startMinutes && nowMinutes < endMinutes) return "in-progress";
  return status === "waiting" ? "waiting" : "confirmed";
}

/** Figma의 상태별 색: 완료 `#2f6b4f`, 진행중 `#8a6a2a`, 예약 `#0d3a33`. */
export const statusStyles: Record<BookingStatus, { label: string; stripe: string; dot: string; badge: string; card: string }> = {
  confirmed: { label: "예약", stripe: "bg-[var(--brand)]", dot: "bg-[var(--brand)]", badge: "bg-[var(--brand-soft)] text-[var(--brand)]", card: "border-[var(--border)] bg-[var(--surface)]" },
  "in-progress": { label: "진행중", stripe: "bg-[var(--accent)]", dot: "bg-[var(--accent)]", badge: "bg-[var(--warning-soft)] text-[var(--accent)]", card: "border-[var(--accent)] bg-[#fbf6ec]" },
  completed: { label: "완료", stripe: "bg-[var(--success)]", dot: "bg-[var(--success)]", badge: "bg-[var(--success-soft)] text-[var(--success)]", card: "border-[var(--border)] bg-[var(--surface)]" },
  waiting: { label: "대기", stripe: "bg-[var(--muted)]", dot: "bg-[var(--muted)]", badge: "bg-[var(--background)] text-[var(--muted)]", card: "border-[var(--border)] bg-[var(--surface)]" },
  cancelled: { label: "취소", stripe: "bg-[var(--danger)]", dot: "bg-[var(--danger)]", badge: "bg-[var(--danger-soft)] text-[var(--danger)]", card: "border-[var(--border)] bg-[var(--background)]" },
};
