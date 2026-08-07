# 산출물 C — 매출 정의 보고서

목적: "매출"이 무엇을 의미하는지 하나로 고정한다. 화면·차트·CSV·인쇄가 서로 다른 숫자를 말하지 않게 한다.

근거는 `lib/finance.ts:calculatePayment`(계산 원본), `lib/salon-store.ts` ledger 스키마(저장 형태), `lib/revenue-data.ts`(현행 집계), 실제 DB 실측이다.

---

## C1. 원장 필드 정의 (Observed)

`calculatePayment`(`lib/finance.ts:42-71`)가 유일한 금액 계산 지점이다.

```
taxable   = gross - discount - points
vat       = round(taxable / (vatMode === "included" ? 11 : 10))
netPaid   = taxable + (vatMode === "separate" ? vat : 0)
fee       = round(payments.card * cardFeeRateBps / 10000)
shopProfit = netPaid - vat - fee - expense
```

ledger 컬럼 대응:

| 컬럼 | 의미 | 계산 |
|---|---|---|
| `gross_won` | **총 시술금액** (할인 전 정가 합계) | 입력값 |
| `discount_won` | 할인액 | 입력값 |
| `points_won` | 포인트 순증감 = 적립 − 사용 | `pointsEarned - pointsUsed` |
| `amount_won` | **실결제액** (고객이 실제 지불한 금액) | `netPaid` |
| `vat_won` | 부가세 | 위 식 |
| `fee_won` | 카드 수수료 | 위 식 |
| `expense_won` | 해당 거래에 직접 귀속된 지출 | 입력값 |
| `profit_won` | **샵 수익** | `netPaid - vat - fee - expense` |

---

## C2. 확정 정의

### 정의 1 — 매출 (기본, 차트의 y축)

> **매출 = `SUM(gross_won)`** — 할인 전 총 시술금액. 환불·정정의 음수 행을 포함하여 합산한다.

근거:
- 현행 `revenue-data.ts:70` `gross = sum(transactions, r => r.gross)`가 이미 `gross_won` 기준이고, 이것이 KPI "총 매출"과 정산 표 "총 매출"의 값이다. (`Observed`)
- 환불·정정 행은 `reversalLedgerInput`(`finance.ts:206`)이 **모든 금액 컬럼을 부호 반전**하여 append한다. 따라서 단순 `SUM`이 곧 순액이다. 별도 차감 로직이 필요 없다. (`Observed`)
- 실측: DB에 환불·정정 행이 **0건**이므로 현재 `SUM(gross_won)` = 총 결제액이다. (`Measured`)

**용어 고정:** 화면·문서·CSV 어디서든 이 값의 라벨은 **"총 매출"** 하나만 쓴다. "매출액", "총액", "판매액"을 혼용하지 않는다.

### 정의 2 — 실결제

> **실결제 = `SUM(amount_won)`**, `kind='expense'` 행 제외.

현행 `revenue-data.ts:73`이 이미 `status !== "지출"` 필터를 건다. (`Observed`)

**총 매출 ≥ 실결제**가 항상 성립하지는 않는다. `vatMode='separate'`면 `netPaid = taxable + vat`가 되어 `gross`를 넘을 수 있다. (`Inferred` — 코드상 가능, 실데이터 미확인)

### 정의 3 — 샵 수익

> **샵 수익 = `SUM(profit_won)`** = 실결제 − VAT − 카드수수료 − 지출.

원장이 실제로 손에 쥐는 금액. 차트의 y축으로는 쓰지 않고 KPI와 정산 표에서만 표시한다.

### VAT 취급

VAT는 **포함/별도 두 모드가 거래마다 다르다** (`details.vatMode`). 따라서:
- **총 매출은 VAT 포함 여부와 무관하게 `gross_won` 그대로다.** VAT-in / VAT-out으로 나눠 표시하지 않는다.
- VAT 금액은 정산 표의 독립 행으로만 노출한다.
- `Requires verification` — 원장이 세무 신고 시 원하는 기준이 "VAT 제외 순매출"이라면 `SUM(gross_won) - SUM(vat_won)` 파생값이 필요하다. **현재 요구사항에 없으므로 만들지 않는다.** 요청 시 정산 표에 행 하나 추가로 대응 가능.

### 할인·포인트

- 할인은 `gross_won`에서 이미 빠지지 **않는다**. `gross_won`은 할인 전 값이고 `discount_won`이 별도 컬럼이다. (`Observed` — `finance.ts:63` `gross: input.gross`)
- 포인트 사용은 `taxable`에서 차감되어 `amount_won`에 반영된다. 포인트 적립은 금액에 영향 없고 `points_won`에만 기록된다.
- 정산 표는 이미 할인·포인트 사용을 독립 행으로 보여준다. **유지한다.**

### 쿠폰

`coupon_won` 컬럼이 스키마에 있으나 `docs/function-coverage-matrix.md`에서 **사용자 승인 제외**다. 어떤 매출 정의에도 포함하지 않는다. (`Observed`)

---

## C3. 날짜 기준과 시간대

### 확정

> **거래일 = `seoulBusinessDate(occurred_at)`** — UTC ISO 문자열을 Asia/Seoul로 변환한 `YYYY-MM-DD`.

`lib/revenue-data.ts:21`이 이미 이 방식이다. (`Observed`)

### 확인된 결함

`revenue-query.ts`의 커서 산술은 `setUTCDate` / `setUTCMonth`를 쓴다. 즉 **범위 경계는 UTC로 계산되고 거래일 판정은 서울로 이뤄진다.** 두 규약이 한 경로에 섞여 있다. (`Observed`)

실측: DB의 모든 ledger 행 시각부가 정확히 `12:00:00.000Z`다. 서울 기준 21:00이므로 어떤 경계 계산에서도 날짜가 흔들리지 않는다. **결함은 실재하나 현 데이터에서 잠복 상태다.** (`Measured`)

`Hypothesis` — 신규 결제가 `finance.ts:occurredAt`을 통해 `+09:00` 오프셋으로 기록되면 자정 근처(서울 00:00~09:00 = UTC 전날 15:00~24:00) 거래에서 경계 오분류가 발생할 수 있다. 서버 집계 도입 시 SQL 쪽에서 일관되게 처리하여 회피한다 (산출물 F §F3).

### 영업일 경계 (정정됨)

`seoulBusinessDate`는 단순 캘린더 날짜가 **아니다.** 서울 시각 09:00 미만이면 하루를 뺀다 (`lib/seoul-date.ts`). 즉 영업일은 서울 09:00에 시작한다. (`Observed`)

서울 = UTC+9이므로 **+9시간 오프셋과 −9시간 컷오프가 상쇄되어, 영업일 = `occurred_at`의 UTC 캘린더 날짜와 항등이다.** 실 ledger 5,576행 전부와 경계 합성 케이스로 검증했다. (`Measured` 2026-08-06)

이 항등성 덕분에 SQL 집계는 `substr(occurred_at, 1, 10)`만으로 TS와 동일한 결과를 낸다 (산출물 F §F3). 자정 넘김 영업 시 귀속 규칙도 이미 코드에 정의되어 있으므로 `[추가확인]` 아니다.

---

## C4. 차트별 적용 정의

| 차트 | y축 | 근거 |
|---|---|---|
| 월별 (§11.1) | 총 매출 = `SUM(gross_won)` | 정의 1 |
| 일별 (§11.2) | 총 매출 = `SUM(gross_won)` | 정의 1 |
| 연도별 (§11.3) | 총 매출 = `SUM(gross_won)` | 정의 1 |
| KPI 스트립 | 총 매출 · 실결제 · VAT · 지출 · 샵 수익 | 정의 1·2·3 |
| 정산 표 | 총 매출 · 할인 · 포인트 사용 · 실결제 · 환불 · VAT · 수수료 · 지출 · 샵 수익 | 현행 9행 유지 |
| CSV | 거래 단위 원본 행 | 집계 아님 |

**세 차트 모두 같은 y축 정의를 쓴다.** 월별 차트 12개월 합계 = 그 해 연도별 차트의 막대 값 = 각 월 일별 차트 합계. 이 항등식은 테스트로 강제한다 (산출물 G §G6).

---

## C5. 미해결 `[추가확인]`

| # | 항목 | 처리 |
|---|---|---|
| C5-1 | 세무 신고용 VAT 제외 순매출이 필요한가 | 요구사항에 없음. 만들지 않음. 요청 시 정산 표 1행 추가 |
| C5-2 | 마이그레이션 데이터의 `serviceMajor` / `paymentMethods`가 비어 있는 이유 | 레거시 원본에 해당 필드가 없었는지, 마이그레이션 누락인지 미확정. 차트는 "분류 미입력" 빈 상태로 처리하고 데이터 보정은 별건 |
| C5-3 | `vatMode='separate'` 거래가 실제로 존재하는가 | 미확인. 존재 시 실결제 > 총 매출이 되어 KPI가 이상해 보일 수 있음 |
| C5-4 | ~~영업일이 자정을 넘는 경우~~ **해소** | `seoulBusinessDate`가 서울 09:00 컷오프로 이미 정의. UTC 날짜와 항등임을 실측 검증 |
