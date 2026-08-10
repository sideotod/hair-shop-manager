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
 * 드롭다운 라벨을 사람이 고를 수 있게 만든다.
 *
 * 원장 DB 에는 "이수린" 이 둘, "김효은" 이 둘 있다. 이름만 찍으면 같은 글자 두 줄이 나와
 * **어느 쪽이 맞는지 인식으로 고를 수 없다.** 동명이인에게만 마스킹된 뒷자리를 붙인다 —
 * 유일한 이름에는 붙이지 않는다. 없는 정보로 줄을 길게 만들 이유가 없다.
 *
 * 정렬은 `localeCompare("ko")`. 삽입 순서로 두면 브라우저 네이티브 select 의
 * 타이핑 점프(이 화면의 유일한 검색 수단)가 무의미해진다.
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
      const suffix = (counts.get(name) ?? 0) > 1 && phone ? ` (${maskPhone(phone).slice(-4)})` : "";
      return { id: customer.id, label: `${name}${suffix}`, name };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "ko"));
}
