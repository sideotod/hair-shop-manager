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
