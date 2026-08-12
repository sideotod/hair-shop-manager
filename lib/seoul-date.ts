const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function dateParts(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.valueOf())) throw new Error("Invalid Seoul date");
  const values = Object.fromEntries(partsFormatter.formatToParts(date).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  return { year: values.year, month: values.month, day: values.day, hour: Number(values.hour), minute: values.minute };
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

/**
 * 저장 시각의 유일한 규약: 화면이 받은 서울 벽시계를 참 시각 ISO 로 새긴다.
 * 예전에는 결제만 이렇게 새기고 예약·지출·네이버 메일은 벽시계 뒤에 `Z` 를 붙여
 * `10:00` 을 `…T10:00:00.000Z`(= 서울 19:00) 로 저장했다. 그래서 같은 문자열을
 * 화면마다 다르게 읽어야 했고, 서울 00:00~08:59 지출은 영업일이 하루 밀렸다.
 */
export function seoulInstant(date: string, time: string) {
  const at = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(at.valueOf())) throw new Error("Invalid Seoul date");
  return at.toISOString();
}

/** 참 시각 ISO 를 서울 벽시계로. 폼 기본값과 화면 표시는 전부 이걸 거친다. */
export function seoulClock(input: Date | string) {
  const { year, month, day, hour, minute } = dateParts(input);
  return { date: `${year}-${month}-${day}`, time: `${String(hour).padStart(2, "0")}:${minute}` };
}

/** 잘못된 값이면 빈 문자열. 폼 프리필처럼 값이 없을 수도 있는 자리에서 쓴다. */
export function seoulClockOrEmpty(input: string) {
  return input && !Number.isNaN(new Date(input).valueOf()) ? seoulClock(input) : { date: "", time: "" };
}
