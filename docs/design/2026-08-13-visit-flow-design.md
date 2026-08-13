# 오늘 예약 한 건을 끝까지 처리하는 흐름 — 설계

작성일: 2026-08-13
범위: P0 (흐름 잇기 + 설정 경계 정리)
근거: `output/competitive-ux-audit-2026-08-13/report.md`, 코드 직접 확인

---

## 1. 문제

기능은 다 있는데 사용자가 메뉴 사이를 직접 조립해야 한다.

지금 원장이 손님 한 명을 처리하려면:

```
예약 화면 → "수정·상태 변경" 서랍 펼침 → 완료 처리
→ 고객 화면 이동 → 결제 등록 → 매출 화면
```

경쟁 제품(공비서·제페코)은 이 이동을 감추고 "지금 이 손님을 처리하는 과정"으로 보이게 한다.

### 1.1 코드에서 확인한 원인

| # | 사실 | 위치 |
|---|---|---|
| A | 예약 행에 결제 진입점이 없다 | `components/bookings/bookings-page.tsx:105` |
| B | 완료 처리조차 `<details>` 안에 접혀 있다 | 같은 줄 |
| C | 대시보드 예약 블록은 `<li>` 다. 링크가 아니다. 빈 시간(`:171`)만 `<Link>` | `components/dashboard/dashboard-page.tsx:177` |
| D | 결제는 예약을 모른다. `details` 에 `bookingId` 없음 | `lib/finance.ts:141-160` |
| E | 결제 시각 기본값이 `10:00` 고정. 요약줄도 `${today} 10:00` | `payment-form.tsx:54` **및** `customer-payment-dialog.tsx:51` |
| F | 시술 대분류 10개가 컴포넌트에 하드코딩. `catalog-items` 와 무관 | `payment-form.tsx:50` **및** `customer-payment-dialog.tsx:43` vs `lib/operations.ts:53` |
| G | **`returnTo` 화이트리스트가 `/bookings` 를 막는다** | `app/payment-actions.ts:12` |
| H | 예약 정책 키에 writer 가 둘 (`saveBookingSettings` / `saveShopSettings`) | `lib/booking.ts:110` + `lib/settings.ts` |
| I | 고객 정책도 편집 폼이 두 곳 | `customers-page.tsx:129` + `settings-page.tsx:50` |

**G 가 이 설계의 전제다.** 이걸 안 고치면 예약 화면에 결제 버튼을 달아도 저장 후 예약으로 못 돌아온다.

### 1.2 명시적으로 받지 않는 지적

- **"방문 시작" 상태 저장** — `lib/day-rail.ts:52` `displayStatus()` 가 현재 시각이 예약 구간 안이면 `in-progress` 를 이미 파생한다. 저장값이 아니다. 여기에 수동 상태를 저장하면 같은 개념의 원천이 둘이 되고, 어느 쪽이 이기는지 규칙을 새로 만들어야 한다. 파생값을 유지한다.
- POS 단말기 직접 연동, 네이버 공식 양방향 API, 직원 급여, 모바일 앱 — 범위 밖.

---

## 2. 설계 원칙

1. **한 화면에서 다음 한 걸음.** 행마다 액션을 다 펼치지 않는다. 상태가 정하는 다음 동작 **하나**만 노출한다. (20행 × 3링크 = Tab 60정거장을 피한다)
2. **URL 이 상태다.** 새 액션도 전부 검색 파라미터로. 클라이언트 상태를 새로 도입하지 않는다.
3. **파생값은 파생인 채로.** 화면에 필요하다고 저장하지 않는다.
4. **저장소가 화면을 가른다.** 이름("운영 설정" vs "설정")이 아니라 어디에 쓰는지로 나눈다.
5. **기존 검증식을 바꾸지 않는다.** 화면이 미리 만족시킨다 (`payment-amounts.tsx` 가 이미 쓰는 방식).

---

## 3. Phase 1 — 왕복 경로 열기

### 3.1 `returnTo` 허용 목록 확장

`app/payment-actions.ts:12` — 고객 화면 리팩터에서 `/customers` 는 이미 추가됨. `/bookings` 만 더한다.

```ts
// 지금
/^(?:\/sales(?:\/transactions)?|\/customers)(?:\?|$)/
// 후
/^(?:\/sales(?:\/transactions)?|\/customers|\/bookings)(?:\?|$)/
```

`app/customer-actions.ts:17` 도 동일하게 `/bookings` 추가.

앞이 고정된 허용 목록 형태는 그대로 유지한다 — 열린 리다이렉트를 만들지 않는다.

**테스트**: `/bookings?date=...` 를 `returnTo` 로 준 결제 저장이 그 URL 로 돌아온다. `//evil.com`, `/bookingsX` 는 `/sales?tab=payment` 로 떨어진다.

---

## 4. Phase 2 — 예약이 결제로 이어진다

### 4.1 예약 행: 상태별 다음 동작 1개

`bookings-page.tsx:105` 의 액션 줄:

```
지금:  [고객 상세] [수정·상태 변경 ▸]
후:    [고객 상세] [<다음 동작>] [수정·상태 변경 ▸]
```

`statusOf(booking)` 이 이미 계산되어 있다. 그 값으로 고른다:

| 표시 상태 | 다음 동작 | 목적지 |
|---|---|---|
| `confirmed` / `in-progress` | `결제 등록` | `/sales?tab=payment&booking=<id>` |
| `waiting` | `예약 확정` | `changeBookingStatus` 폼, `status=confirmed` |
| `completed` | 없음 | — |
| `cancelled` | 없음 | (행 자체가 목록에 없음) |

`waiting` 은 **예약 상태**다. 별도 `waiting-customers` 대기 명단은 고객 화면 리팩터에서 삭제됐고 되살리지 않는다.

완료 처리·취소·수정은 `<details>` 안에 그대로 둔다. 결제를 등록하면 예약이 완료로 바뀌므로(§4.4) 완료 처리 버튼을 밖으로 꺼낼 이유가 사라진다.

`in-progress` 에도 결제를 주는 이유: 시술 도중 선결제하는 경우가 실재하고, 상태가 시각 파생이라 원장이 통제할 수 없기 때문이다.

### 4.2 대시보드 예약 블록을 링크로

`dashboard-page.tsx:177` `<li>` 안을 `<Link href={...}>` 로 감싼다. 목적지는 §4.1 과 같은 규칙.

`aria-hidden` 레일이 아니라 대시보드 본 축이므로 포커스 대상이 되는 게 맞다. 스크롤 상자(`:161`)가 이미 `tabIndex={0}` 이라 키보드로 도달 가능하다.

**주의**: 예약 블록이 포커스를 받으면 빈 시간 링크(`:171`)와 Tab 순서가 섞인다. 둘 다 DOM 순서가 곧 시간 순서가 되도록 `railGaps` 와 `railBookings` 를 시작 시각으로 합쳐 하나의 `<ol>` 로 그린다.

### 4.3 `/sales?tab=payment&booking=<id>` 프리필

`app/(shell)/sales/page.tsx` payment 분기:

```ts
const booking = value(params.booking) ? store.get("bookings", value(params.booking)) : null;
```

`booking` 에서 뽑아 `PaymentForm` 에 넘긴다:

| 폼 칸 | 출처 | 없을 때 |
|---|---|---|
| `customerId` | `booking.value.customerId` | `params.customer` (기존 동작) |
| 시술 상세 (`serviceDetail`) | `booking.value.service` | 빈칸 |
| `occurredDate` / `occurredTime` | `booking.value.endsAt` 의 서울 벽시계 | §4.5 |
| `returnTo` | 호출한 예약 화면 URL | `/sales?tab=payment` |

`serviceMajor` 는 프리필하지 않는다. 예약의 `service` 는 자유 입력 문자열이라(`booking.ts:100`) 대분류로 확실히 매핑할 수 없다. 틀린 값을 미리 채우는 것보다 원장이 고르는 게 낫다.

`bookingId` 는 hidden input 으로 폼에 실어 `finance.ts` 가 `details.bookingId` 에 넣는다:

```ts
// lib/finance.ts:141 details 안
...(text(formData, "bookingId") ? { bookingId: text(formData, "bookingId") } : {}),
```

검증하지 않는다 — 존재하지 않는 예약 id 를 넣어도 원장 금액에 영향이 없고, 검증을 넣으면 예약이 나중에 취소·보관될 때 과거 결제 정정이 막힌다.

### 4.4 결제 후 예약 완료

`recordPayment` 성공 후, `bookingId` 가 있고 그 예약이 활성이면 `completed` 로 바꾼다.

**같은 트랜잭션 안에서 하지 않는다.** `changeBookingStatusRecord`(`booking.ts:109`)는 FormData 를 재조립해 `saveBookingRecord` 를 통째로 다시 태운다 — `validateBooking` + 중복 검사까지. 과거 예약이 현재 영업시간 정책과 안 맞으면 `영업 시간을 확인하세요` 로 던진다. **결제가 예약 정책 때문에 실패하면 안 된다.**

그래서:

```ts
// app/payment-actions.ts savePayment 안, recordPayment 성공 이후
try { markBookingCompleted(store, bookingId); } catch { /* 예약 상태는 원장 정확성보다 뒤다 */ }
```

`markBookingCompleted` 는 `lib/booking.ts` 에 새로 만든다. `saveBookingRecord` 를 거치지 않고 상태 필드 + `statusHistory` 만 갱신한다:

```ts
export function markBookingCompleted(store: SalonStore, id: string) {
  const existing = store.get("bookings", id);
  if (!existing || existing.archivedAt) return null;
  const current = value(existing);
  if (string(current, "status") !== "confirmed") return null;   // 취소·완료는 건드리지 않는다
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  return store.save("bookings", id, {
    ...current, status: "completed",
    statusHistory: [...history, { status: "completed", at: new Date().toISOString(), actor }],
  }, actor);
}
```

검증을 건너뛰는 게 아니라 **바꾸는 값이 하나뿐이라 검증할 것이 없다.** 시각·고객·시술은 손대지 않는다.

성공 안내를 바꾼다: `결제를 저장했습니다.` → `결제를 저장하고 예약을 완료 처리했습니다.` (예약이 실제로 바뀐 경우만)

### 4.5 결제 기본 시각

`payment-form.tsx:54` **와 `customer-payment-dialog.tsx:51`** — 같은 `10:00` 이 두 곳에 복제돼 있다.

| 상황 | 기본값 |
|---|---|
| `booking` 프리필 | 예약 `endsAt` 의 서울 날짜·시각 |
| 그 외 | **현재 서울 시각**, 분은 그대로 |

`10:00` 은 사라진다. `payment-form.tsx` 의 `<summary>` 요약줄도 실제 값을 쓴다.

서버 컴포넌트에서 계산해 `today: string` 대신 `defaultDate` / `defaultTime` 두 개를 내린다 — 렌더 중 `new Date()` 를 부르지 않는다(같은 요청의 재렌더마다 마크업이 달라진다, `requestKey` 주석과 같은 이유).

`/customers` 다이얼로그는 예약과 무관하므로 항상 "현재 시각" 쪽이다. `app/(shell)/customers/page.tsx` 가 지금 넘기는 `today={seoulDate()}` 를 `defaultDate`/`defaultTime` 쌍으로 바꾼다.

**데이터 품질 근거**: `lib/salon-briefing.ts:73` `isUsableHourPattern()` 이 "모든 행이 같은 시각이면 방문 분포가 아니다"라며 시간대 분석을 이미 차단하고 있다. 10:00 고정이 그 차단을 영구화한다.

### 4.6 시술 대분류를 카탈로그에서

하드코딩 `<option>` 10개가 `payment-form.tsx:50` 과 `customer-payment-dialog.tsx:43` **두 곳**에 있다. 세 번째 복제를 만들지 않는다 — 목록 계산을 `lib/operations.ts` 에 한 번만 둔다:

```ts
// lib/operations.ts
export const FALLBACK_SERVICE_MAJORS = ["커트", "펌", "매직", "드라이", "클리닉", "컬러", "업스타일", "매니큐어", "세트메뉴", "기타"] as const;

/** 카탈로그의 대분류 이름. 비어 있으면 기존 하드코딩 목록. `current` 가 목록에 없으면 앞에 끼운다. */
export function serviceMajorOptions(catalog: readonly SalonRecord<JsonValue>[], current?: string): readonly string[] {
  const names = catalog.filter((item) => string(object(item.value), "type") === "service-major")
                       .map((item) => string(object(item.value), "name")).filter(Boolean);
  const list = names.length ? names : [...FALLBACK_SERVICE_MAJORS];
  return current && !list.includes(current) ? [current, ...list] : list;
}
```

두 폼 모두 `catalog` prop 을 받아 이 함수를 부른다. `sales/page.tsx` payment 분기와 `customers/page.tsx` 에서 `store.list("catalog-items")` 를 읽어 넘긴다.

`current` 인자가 필요한 이유: 정정 화면에서 기존 결제의 `serviceMajor` 가 새 카탈로그에 없을 수 있다. 정정하려다 대분류가 조용히 바뀌면 안 된다.

**같은 방향의 후속(이번 범위 밖)**: 시술 상세도 `service-detail` 카탈로그에서 고르게 하고 가격을 자동 채우는 것. 지금은 대분류만 잇는다.

---

## 5. Phase 3 — 설정 경계 정리

### 5.1 조사 결과: 지출은 설정이 아니다

`/operations` 세 탭은 성격이 다르다.

| 탭 | 저장소 | 성격 |
|---|---|---|
| 시술 설정 | `catalog-items` 레코드 | 참조 데이터 |
| 메모·상태값 | `saveSettings` | 설정 |
| **지출·정산** | **`appendLedger`** (`operations.ts:41`) | **불변 금융 원장** |

지출 정정은 역분개 + 대체 2행을 남긴다 — 결제 정정과 동일 구조. 그리고 이미 `/sales?tab=expenses` 로도 같은 컴포넌트가 렌더된다(`sales/page.tsx:132`, `salesContext` 플래그).

즉 지금은 **기간 정산(총매출·VAT·수수료·샵수익)을 보려면 "운영 설정"에 들어가야 한다.** 이걸 `/settings` 로 옮기면 더 나빠진다.

### 5.2 목표 구조

```
/sales      매출 분석 · 결제 등록 · 지출/정산       ← 돈. 이미 3탭 존재, 정본으로 승격
/settings   매장·고객·결제·예약·문자·연동·도움말
            + 시술 가격표      ← /operations?tab=services 이관
            + 메모·상태값      ← /operations?tab=memos 이관
/operations 삭제 (사이드바 7→6)
```

`salesContext` 분기가 이 과정에서 사라진다.

`hiddenMenus` 검증(`lib/settings.ts:99`)에서 `/operations` 를 뺀다. 이미 저장된 값에 `/operations` 가 있으면 저장 시 던지므로, 읽을 때 무시하고 다음 저장에서 자연히 빠지게 한다.

### 5.3 정책 편집 폼은 한 곳

| 정책 | 지금 | 후 |
|---|---|---|
| 예약(영업시간·슬롯·중복·알림) | `bookings-page.tsx:107` **와** `settings-page.tsx:59` | `/settings?section=booking` 만 |
| 고객 | ~~두 곳~~ **고객 화면 리팩터에서 이미 해소됨** | `/settings?section=customer` (현재 상태 유지) |

업무 화면에는 **현재 값 표시 + `설정에서 변경` 링크**만 남긴다. 예약 화면 우측 `영업 시간` 카드(`bookings-page.tsx:106`)가 이미 그 역할을 하고 있다 — 거기에 링크 한 줄을 더한다.

`saveBookingSettings` 서버 액션과 `lib/booking.ts` `saveBookingSettingsRecord` 는 **삭제**한다. 예약 정책 writer 는 `saveShopSettings` 하나가 된다.

**검증 손실 없음(정정).** 이 문서 초안은 "`saveShopSettings` 가 슬롯 정합성을 검증하지 않는다"고 썼으나 틀렸다. `lib/settings.ts:86` 이 예약 키가 하나라도 오면 `bookingSettings()` 를 호출해 `60 % slot === 0`, `open % slot === 0` 을 이미 검사한다. 두 writer 의 검증 강도는 같다. 따라서 이 Phase 는 정합성 복구가 아니라 **중복 제거**가 목적이다.

`bookings-page.tsx` 의 `<details>` 안에서 예약 설정 폼만 빼고 `NaverMailConnection` 은 남긴다 — 설정이 아니라 운영 상태다. (상태센터 승격은 P1)

`reminderDayBefore`/`reminderDayOf` 두 체크박스는 지금 `saveBookingSettingsRecord` 만 쓴다. `settings-page.tsx` 의 `Booking` 폼에 옮겨 붙여야 기능이 사라지지 않는다. `lib/settings.ts` 의 `section === "booking"` 분기에서 `bookingAllowOverlap` 과 같은 방식으로 읽는다.

---

## 6. 흐름 요약

```
대시보드 축 예약 블록 클릭
  └─ confirmed  → /sales?tab=payment&booking=<id>
                    고객·시술·시각 프리필
                    저장 → 원장 기록 + 예약 완료
                    → returnTo 로 예약/대시보드 복귀
  └─ waiting    → 예약 확정
예약 화면 행에서도 같은 동작
```

---

## 7. 테스트

Phase 1
- `/bookings` 로 시작한 결제 저장이 그 URL 로 복귀
- `//evil.com` · `/bookingsX` 는 기본 경로로

Phase 2
- 상태별 다음 동작이 정확히 하나 (`completed` 는 없음)
- `&booking=<id>` 가 고객·시술·시각을 채움
- 저장된 원장 `details.bookingId` 일치
- 결제 저장 시 `confirmed` 예약이 `completed` 로, `statusHistory` 에 한 줄 추가
- **취소·보관된 예약은 그대로** (`markBookingCompleted` 가 `null` 반환)
- **예약 상태 갱신이 실패해도 원장은 저장된다** (존재하지 않는 `bookingId` 로 검증)
- 결제 시각 기본값이 예약 `endsAt`, 없으면 현재 시각. `10:00` 이 어디에도 없음 (**두 폼 모두**)
- `serviceMajorOptions()`: 카탈로그 비면 fallback 10개, 있으면 카탈로그 값
- `serviceMajorOptions(catalog, "없는값")` 이 그 값을 목록 앞에 유지

Phase 3
- 예약 정책 저장이 슬롯 정합성 검증을 통과/거부 (`saveShopSettings` 경유)
- `reminderDayBefore`/`reminderDayOf` 가 설정 화면에서 저장·복원됨 (이관 중 유실 방지)
- `/operations` 삭제 후 `hiddenMenus` 에 `/operations` 가 남아 있어도 설정 저장이 안 깨짐
- 사이드바 6항목

Playwright (375은 제외 — 데스크톱 전용, 최소 1280)
- 1440×900: 예약 행 액션 줄이 안 넘침, 결제 프리필 확인
- 1280×800: 대시보드 축 예약 블록 포커스 링 보임
- 축에서 Tab 이 시간 순서(빈 시간·예약 섞여도)
- `prefers-reduced-motion` 회귀 없음

---

## 8. 하지 않는 것

- "방문 시작" 저장 상태 (§1.2)
- 시술 상세·가격 자동 채움 (다음 라운드)
- 네이버 동기화 상태센터, CSV 대조·가져오기, 첫 실행 체크리스트, 실제 SMS 발송 (P1)
- POS 단말기 연동, 네이버 공식 API, 직원 급여, 모바일

## 9. 전제

고객 화면 리팩터는 완료됐다 (`tsc` 통과 확인, 2026-08-13). 그 과정에서 이 설계에 영향을 준 변화:

- `waiting-customers` 대기 명단 기능 전면 삭제. 되살리지 않는다 (§4.1).
- `/customers` 안에 컴팩트 결제 다이얼로그 신설 (`customer-payment-dialog.tsx`). `10:00` 과 시술 대분류 하드코딩이 이 파일에도 복제됐다 — §4.5·§4.6 이 두 파일을 함께 다룬다.
- `returnTo` 에 `/customers` 는 이미 추가됨. Phase 1 은 `/bookings` 만 남았다.

DB 정리(`scripts/prune-customer-fields.mjs`)는 사용자가 진행 중이다. 이 설계는 고객 레코드 필드를 읽지 않으므로 무관하다.
