export type RevenuePreset = "today" | "week" | "month" | "previous";

export const REVENUE_STAFF_OPTIONS = [["all", "전체"], ["seoyun", "서윤 원장"], ["harin", "하린 실장"], ["dohyeon", "도현 디자이너"], ["mina", "민아 디자이너"]] as const;
export const REVENUE_SERVICE_OPTIONS = [["all", "전체"], ["color", "컬러"], ["perm", "펌"], ["clinic", "클리닉"], ["cut", "컷"]] as const;
export const REVENUE_PAYMENT_OPTIONS = [["all", "전체"], ["card", "카드"], ["cash", "현금"], ["prepaid", "선불권"], ["other", "기타"]] as const;

export type RevenueQuery = {
  preset: RevenuePreset;
  start: string;
  end: string;
  compare: boolean;
  staff: string;
  service: string;
  payment: string;
};

export const DEFAULT_REVENUE_QUERY: RevenueQuery = {
  preset: "week",
  start: "2026-07-24",
  end: "2026-07-30",
  compare: true,
  staff: "all",
  service: "all",
  payment: "all",
};

const presets = new Set<RevenuePreset>(["today", "week", "month", "previous"]);
const staffKeys = new Set<string>(REVENUE_STAFF_OPTIONS.map(([key]) => key));
const serviceKeys = new Set<string>(REVENUE_SERVICE_OPTIONS.map(([key]) => key));
const paymentKeys = new Set<string>(REVENUE_PAYMENT_OPTIONS.map(([key]) => key));

export function revenuePresetRange(preset: RevenuePreset) {
  if (preset === "today") return { start: "2026-07-30", end: "2026-07-30" };
  if (preset === "month") return { start: "2026-07-01", end: "2026-07-30" };
  if (preset === "previous") return { start: "2026-06-01", end: "2026-06-30" };
  return { start: "2026-07-24", end: "2026-07-30" };
}

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export function parseRevenueQuery(input: string | URLSearchParams): RevenueQuery {
  const params = typeof input === "string" ? new URLSearchParams(input) : input;
  const preset = params.get("preset") as RevenuePreset | null;
  const start = params.get("start");
  const end = params.get("end");
  const staff = params.get("staff") || "all";
  const service = params.get("service") || "all";
  const payment = params.get("payment") || "all";

  if (!preset || !presets.has(preset) || !isDate(start) || !isDate(end) || start > end
    || !staffKeys.has(staff) || !serviceKeys.has(service) || !paymentKeys.has(payment)) return DEFAULT_REVENUE_QUERY;

  return {
    preset,
    start,
    end,
    compare: params.get("compare") === "true",
    staff,
    service,
    payment,
  };
}

export function parseRevenueSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (typeof value === "string") params.set(key, value);
  return parseRevenueQuery(params);
}

export function serializeRevenueQuery(query: RevenueQuery) {
  return new URLSearchParams({
    preset: query.preset,
    start: query.start,
    end: query.end,
    compare: String(query.compare),
    staff: query.staff,
    service: query.service,
    payment: query.payment,
  }).toString();
}
