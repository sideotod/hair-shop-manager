/**
 * 목록 노출용 전화번호 마스킹 (PRODUCT.md `## Accessibility & Inclusion`).
 *
 * 고객 목록과 목록 인쇄본은 원장이 아닌 사람 눈에도 들어간다 — 카운터에 띄워 둔 화면,
 * 출력해서 들고 다니는 종이. 가운데 국번만 가리면 뒷번호로 사람은 구분되고 번호는 새지 않는다.
 * 선택 고객 상세는 마스킹하지 않는다. 전화를 걸려고 여는 화면이라 가리면 기능이 사라진다.
 */
export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return phone;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

/**
 * 상세 화면용 하이픈 표기. `01012345678` → `010-1234-5678`.
 *
 * 저장은 숫자만 한다 — 검색·중복 판정이 형식에 걸리지 않게 하려는 것이다.
 * 사람이 읽는 자리에서만 끊어 준다. 010 이 아닌 번호(02·031·1588)는 형식을
 * 짐작하지 않고 그대로 돌려준다 — 틀린 위치에 하이픈을 넣으면 안 넣느니만 못하다.
 */
export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(digits)) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
}
