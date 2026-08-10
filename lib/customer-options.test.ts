import { describe, expect, it } from "vitest";

import { customerOptions } from "./customer-options";

const customer = (id: string, name: string, phone = "") => ({ id, value: { name, phone } });

describe("customerOptions", () => {
  it("동명이인에게만 뒷자리를 붙이고 가나다순으로 정렬한다", () => {
    const options = customerOptions([
      customer("c-3", "이수린", "01098761234"),
      customer("c-1", "김효은", "01011112222"),
      customer("c-2", "이수린", "01055555678"),
    ]);
    expect(options.map((option) => option.label)).toEqual(["김효은", "이수린 (1234)", "이수린 (5678)"]);
  });

  it("번호가 없는 동명이인은 라벨을 늘리지 않는다", () => {
    expect(customerOptions([customer("c-1", "000"), customer("c-2", "000")]).map((option) => option.label)).toEqual(["000", "000"]);
  });
});
