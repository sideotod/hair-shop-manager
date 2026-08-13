import { createHash } from "node:crypto";

/**
 * 화면에 보여줄 고객 번호. **표시 전용이다.**
 *
 * 레코드 `id`(`hairnury-336734`, `customer-<uuid>`)는 그대로 둔다 — 원장 5,576행과
 * 예약·문자가 전부 그 값을 가리키고 있어서, 번호를 새로 매기면 그 참조를 전부 옮겨야 한다.
 * 원장이 전화로 "고객번호 뭐라고 하셨죠"를 주고받을 짧은 이름만 여기서 만든다.
 *
 * 검색 대상이 아니다. 원장이 외우는 것은 이름과 뒷번호지 해시가 아니다.
 */
export function customerCode(id: string) {
  return `C-${createHash("sha256").update(id).digest("hex").slice(0, 6).toUpperCase()}`;
}
