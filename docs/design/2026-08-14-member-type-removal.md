# 데이터 구조 변경 — `details.memberType` 폐기 (2026-08-14)

## 무엇이 바뀌었나

결제 원장(`ledger_entries`)의 JSON `details` 에서 **`memberType` 을 더 이상 쓰지 않는다.**

회원 여부를 나르던 칸이 두 개였다 — `details.memberType`(`"member"` / `"non-member"`)과
`customerId`. 같은 사실을 두 번 말했고, 두 값이 어긋날 수 있었다(회원인데 고객이 비어 있거나,
비회원인데 고객이 붙어 있거나). 서버는 그때 무엇을 믿을지 정할 방법이 없었다.

**남은 규칙은 하나다: 등록되어 있는 사람이 회원이다.**

| 판단 | 예전 | 지금 |
|---|---|---|
| 회원인가 | `details.memberType === "member"` | `entry.customerId` 가 있는가 |
| 비회원 이름 | `details.customerName` | 그대로 (`details.customerName`) |
| 포인트 사용·적립 가능 | `memberType === "member"` | `customerId` 가 있을 때만 |

## SQL 스키마는 그대로다

`memberType` 은 컬럼이 아니라 `details` JSON 안의 키였다. 테이블·인덱스·마이그레이션 변경 없음.

## 과거 행은 어떻게 되나

**지우지 않는다.** 이미 저장된 결제 행에는 `details.memberType` 이 그대로 남아 있다.
원장은 불변 기록이므로 과거를 고쳐 쓰지 않는다.

읽는 쪽은 **없어도 되는 값**으로 다뤄야 한다:

- 새 행에는 이 키가 없다.
- 옛 행에는 있고, 값이 `customerId` 와 어긋날 수도 있다(그래서 없앤 것이다).
- 회원 여부가 필요하면 **언제나 `entry.customerId` 를 본다.** `details.memberType` 을 읽는
  코드를 새로 쓰지 않는다.

현재 이 키를 읽는 코드는 없다 (`grep -r memberType` 로 확인).

## 화면에서 함께 사라진 것

- 결제 등록의 `구분`(회원/비회원) 셀렉트 — `components/sales/payment-customer.tsx`
- 858명짜리 `회원 고객` 드롭다운 — 같은 파일. 이름 + 휴대전화 뒷자리 조회로 바뀌었다.
- `<input name="memberType" type="hidden" value="member">` — `components/customers/customer-payment-dialog.tsx`
- 서버 검증 `"회원 구분을 확인하세요."` / `"결제 고객을 확인하세요."` — `lib/finance.ts`

비회원 결제는 이제 **이름과 뒷자리를 비운 채 저장**하면 된다. 고객 없는 결제가 유효한 상태다.

## 오류 문구 변경

| 예전 | 지금 |
|---|---|
| `비회원은 포인트를 사용하거나 적립할 수 없습니다.` | `등록되지 않은 고객은 포인트를 사용하거나 적립할 수 없습니다.` |

문구를 바꾼 이유: "비회원" 은 등급 이름처럼 읽히는데 이제 등급이 없다. 사실은 "아직 등록하지
않은 손님" 이다.
