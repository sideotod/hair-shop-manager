const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function dateParts(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.valueOf())) throw new Error("Invalid Seoul date");
  const values = Object.fromEntries(partsFormatter.formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  return { year: values.year, month: values.month, day: values.day, hour: Number(values.hour) };
}

function isoDate(year: string, month: string, day: string, offset = 0) {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + offset));
  return date.toISOString().slice(0, 10);
}

export function seoulDate(input: Date | string = new Date()) {
  const { year, month, day } = dateParts(input);
  return isoDate(year, month, day);
}

export function seoulBusinessDate(input: Date | string = new Date()) {
  const { year, month, day, hour } = dateParts(input);
  return isoDate(year, month, day, hour < 9 ? -1 : 0);
}
