export type RevenuePreset = "today" | "week" | "month" | "previous";

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

  if (!preset || !presets.has(preset) || !isDate(start) || !isDate(end)) return DEFAULT_REVENUE_QUERY;

  return {
    preset,
    start,
    end,
    compare: params.get("compare") === "true",
    staff: params.get("staff") || "all",
    service: params.get("service") || "all",
    payment: params.get("payment") || "all",
  };
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
