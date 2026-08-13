import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CustomerForm, findDuplicates, type DuplicateEntry } from "./customer-form";

const index: readonly DuplicateEntry[] = [
  ["c1", "김하늘", "female", "01012345678", "2024-03-01", "볼륨매직"],
  ["c2", "이도윤", "male", "01012345678", "2025-01-09", ""],
  ["c3", "박서준", "male", "01099995678", "2025-06-02", ""],
  ["c4", "김하늘", "female", "01077778888", "2026-02-02", ""],
  ["c5", "김하늘", "female", "01088885678", "2026-04-04", ""],
];

function form(props: Partial<React.ComponentProps<typeof CustomerForm>> = {}) {
  return renderToStaticMarkup(<CustomerForm returnTo="/customers" settings={{}} today="2026-08-13" {...props} />);
}

describe("findDuplicates", () => {
  /**
   * 다섯 갈래를 강한 순서로 준다. "중복입니다" 한 마디로는 사용자가 판단할 수 없다 —
   * 번호까지 같으면 대개 같은 사람이고, 이름만 같으면 동명이인이며,
   * 뒷자리만 같으면 앞자리를 잘못 친 것일 수 있다.
   */
  it("ranks the five ways two customers can look alike", () => {
    // 이름+번호 → 번호 → 이름+뒷자리 → 뒷자리 → 이름. 한 번의 조회에 다섯 갈래가 모두 나온다.
    expect(findDuplicates(index, "김하늘", "010-1234-5678").map(({ entry, tier }) => [entry[0], tier]))
      .toEqual([["c1", 0], ["c2", 1], ["c5", 2], ["c3", 3], ["c4", 4]]);
    // 이름만 같은 경우도 잡는다 — 다만 가장 약한 신호다.
    expect(findDuplicates(index, "김하늘", "010-5555-4444").map(({ entry, tier }) => [entry[0], tier])).toEqual([["c1", 4], ["c4", 4], ["c5", 4]]);
  });

  /**
   * 옮겨온 고객은 `010 - 7124 - 2419` 처럼 공백과 하이픈이 섞인 채로 저장돼 있다(실측).
   * 한쪽만 정리하면 번호가 똑같은 사람도 "뒷자리만 같음" 으로 떨어진다.
   */
  it("compares digits only, whatever punctuation the stored number carries", () => {
    const messy: readonly DuplicateEntry[] = [["c9", "옮겨온", "female", "010 - 7124 - 2419", "2023-03-27", ""]];

    expect(findDuplicates(messy, "옮겨온", "010-7124-2419").map(({ tier }) => tier)).toEqual([0]);
    expect(findDuplicates(messy, "다른이름", "01071242419").map(({ tier }) => tier)).toEqual([1]);
  });

  it("waits for two name letters or four phone digits, and skips the record being edited", () => {
    // "김" 한 글자로 858명을 훑으면 등록을 시작하자마자 패널이 열린다.
    expect(findDuplicates(index, "김", "")).toEqual([]);
    expect(findDuplicates(index, "", "010")).toEqual([]);
    expect(findDuplicates(index, "김하늘", "01012345678", "c1").map(({ entry }) => entry[0])).toEqual(["c2", "c5", "c3", "c4"]);
  });
});

describe("CustomerForm", () => {
  it("registers with six fields and defaults the first visit to today", () => {
    const html = form();

    for (const field of ["name", "gender", "phone", "joinedAt", "prepaidWon", "memo"]) expect(html).toContain(`name="${field}"`);
    expect(html).toContain('name="joinedAt" value="2026-08-13"');
    // 중복 허용 체크박스는 없앴다. 확인은 중복이 실제로 있을 때 옆 패널이 묻는다.
    expect(html).not.toContain('type="checkbox"');
  });

  it("keeps the imported timestamp out of the date field", () => {
    const customer = { id: "c1", kind: "customers", value: { name: "김하늘", phone: "01012345678", joinedAt: "2020-02-18T12:00:00.000Z" }, createdAt: "", updatedAt: "", archivedAt: null };
    const html = form({ customer });

    expect(html).toContain('name="joinedAt" value="2020-02-18"');
    // 잔액을 덮어쓰면 원장에 없는 돈이 생긴다. 수정 화면에는 칸 자체가 없다.
    expect(html).not.toContain('name="prepaidWon"');
  });

  /** 서버 렌더에는 입력이 없으므로 패널은 접힌 채(`0fr`)로 시작한다. 펼침은 브라우저에서 일어난다. */
  it("ships the duplicate panel collapsed and motion-safe", () => {
    const html = form({ duplicateIndex: index });

    expect(html).toContain("grid-cols-[0fr]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain('aria-label="중복 고객 확인"');
  });

  /**
   * 접힌 상태의 폭은 예전(420px 팝업 = 40 패딩 + 380 칸)과 같아야 한다.
   * 여백을 바깥 `gap` 이나 안쪽 `pl-` 로 두면 접혀도 20px 이 남고(`border-box` 라 폭 0에도
   * 패딩은 자리를 차지한다) 헤더가 그 폭을 따라 늘어나 닫기 버튼만 오른쪽으로 밀린다.
   */
  it("keeps the collapsed width identical to the plain form", () => {
    const html = form({ duplicateIndex: index });

    expect(html).not.toContain("items-stretch gap-5");
    expect(html).not.toContain("overflow-hidden pl-5");
    // 여백은 잘려 나가는 쪽(패널 자신)에 붙는다.
    expect(html).toContain("ml-5");
    // 두 칸은 같은 폭·같은 높이로 선다.
    expect(html.match(/w-\[380px\]/g)).toHaveLength(2);
    expect(html).toContain("h-full");
  });
});
