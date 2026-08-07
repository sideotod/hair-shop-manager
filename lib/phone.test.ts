import { describe, expect, it } from "vitest";

import { maskPhone } from "./phone";

describe("maskPhone", () => {
  it("가운데 국번을 가리고 뒷번호는 남긴다", () => {
    expect(maskPhone("01037941933")).toBe("010-****-1933");
    expect(maskPhone("010-3794-1933")).toBe("010-****-1933");
    expect(maskPhone("0111234567")).toBe("011-****-4567");
  });

  it("전화번호가 아닌 문자열은 그대로 둔다", () => {
    expect(maskPhone("휴대전화 없음")).toBe("휴대전화 없음");
    expect(maskPhone("-")).toBe("-");
    expect(maskPhone("")).toBe("");
  });
});
