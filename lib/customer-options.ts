import { maskPhone } from "./phone";
import type { JsonValue } from "./salon-domain";

type Customer = { id: string; value: JsonValue };

function field(customer: Customer, key: string) {
  const value = customer.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const item = (value as Record<string, JsonValue>)[key];
  return typeof item === "string" ? item : "";
}

/**
 * 이름이 없는 고객. 가져온 원장 860명 중 100명이 여기 걸린다.
 *
 * 이전 프로그램에서 이름 칸에 `00`·`000`·`0000` 만 남기고 넘어온 행들이다. 전화번호도
 * 방문 이력도 진짜지만 이름은 사람을 가리키지 않는다. 글자가 한 자도 없으면 이름이 아니다.
 */
function nameless(name: string) {
  return !/[가-힣a-zA-Z]/.test(name);
}

/**
 * 드롭다운 라벨을 사람이 고를 수 있게 만든다.
 *
 * 원장 DB 에는 "이수린" 이 둘, "김효은" 이 둘 있다. 이름만 찍으면 같은 글자 두 줄이 나와
 * **어느 쪽이 맞는지 인식으로 고를 수 없다.** 동명이인에게만 마스킹된 뒷자리를 붙인다 —
 * 유일한 이름에는 붙이지 않는다. 없는 정보로 줄을 길게 만들 이유가 없다.
 * 이름이 아예 없는 행은 언제나 뒷자리를 붙인다. 그게 남은 유일한 식별자다.
 *
 * 정렬은 `localeCompare("ko")`. 삽입 순서로 두면 브라우저 네이티브 select 의
 * 타이핑 점프(이 화면의 유일한 검색 수단)가 무의미해진다.
 * 다만 숫자가 한글보다 앞서므로 이름 없는 100명이 목록 머리를 통째로 차지했다 —
 * 드롭다운을 열면 `000 (0234)` 가 30줄 먼저 나오고 진짜 이름은 그 아래에 있었다.
 * 이름 있는 사람을 앞에, 이름 없는 행을 뒤로 보낸다. 지우지는 않는다 — 원장의 고객이다.
 */
export function customerOptions(customers: readonly Customer[]) {
  const counts = new Map<string, number>();
  for (const customer of customers) {
    const name = field(customer, "name") || customer.id;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return customers
    .map((customer) => {
      const name = field(customer, "name") || customer.id;
      const phone = field(customer, "phone");
      const unnamed = nameless(name);
      const suffix = ((counts.get(name) ?? 0) > 1 || unnamed) && phone ? ` (${maskPhone(phone).slice(-4)})` : "";
      return { id: customer.id, label: `${name}${suffix}`, name, unnamed };
    })
    .sort((left, right) => Number(left.unnamed) - Number(right.unnamed) || left.label.localeCompare(right.label, "ko"));
}
