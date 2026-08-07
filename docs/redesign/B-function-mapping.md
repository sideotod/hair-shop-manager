# 산출물 B — FUNCTION.md 기능 보존 매핑표

전체 263행 계약은 `docs/function-coverage-matrix.md`에 이미 존재하고 `lib/function-coverage.test.ts`가 강제한다. 이 문서는 **재설계가 실제로 건드리는 범위**만 재설계 후 위치로 다시 매핑한다. 표의 "현행"은 `Observed`(코드 직접 확인), "재설계 후"는 계획이다.

**규칙:** 재설계 후 열이 비면 안 된다. 기능을 옮기면 옮긴 위치를, 대체하면 대체 수단을 명시한다. 삭제는 `docs/function-coverage-matrix.md`에서 이미 "사용자 승인 제외"로 확정된 행에만 허용된다.

---

## B1. 매출 조회·집계 (재설계 직접 영향)

| FUNCTION.md 기능 | 커버리지 상태 | 현행 위치 | 재설계 후 위치 | 보존 방식 |
|---|---|---|---|---|
| 일별 매출 | 구현 | `revenue-dashboard.tsx:384` 목록 | `RevenueDailyChart` (월 선택 → 1일~말일 선 차트) + `/sales?view=day` 유지 | 확장. 달력 축·0원 구분 추가. 기존 URL 그대로 동작 |
| 월별 매출 | 구현 | `revenue-dashboard.tsx` (월 범위 필터만, 차트 없음) | `RevenueMonthlyChart` (선택 연도 1~12월) + `/sales?view=month` 유지 | 확장. 신규 차트 추가, 기존 조회 유지 |
| 기간별 매출 `[추가확인]` | 구현 | `revenue-query.ts` day/week/month/total | 동일 + `view=year` 추가 | 확장. 기존 4뷰 전부 유지 |
| 시술 유형별 매출 | 구현 | `revenue-dashboard.tsx` "시술 카테고리" 카드 | **동일 위치 유지**. 유형이 1종뿐일 때는 차트 대신 "분류 미입력 11건" 안내로 폴백 | 보존 + 빈 상태 처리 |
| 결제 수단별 매출 | 구현 | `revenue-dashboard.tsx` "결제 수단" 카드 | **동일 위치 유지**. 수단이 1종뿐일 때 동일 폴백 | 보존 + 빈 상태 처리 |
| 현금영수증/카드/N페이 등 결제 구분 | 구현 | 위와 동일 카드 | 동일 | 무변경 |
| 결제 수수료 | 구현 | 정산 표 행 | 정산 표 행 (서버 집계 `RevenueSummary.fee`에서 공급) | 보존. 계산 주체만 서버로 이동 |
| 샵 수익 계산 | 구현 | `lib/finance.ts:calculatePayment` | **무변경** | 재설계 범위 밖 |
| 매출 내역 수정 (정정) | 구현 | `/sales/transactions` 정정 링크 → `?tab=payment&correction=` | 동일. 차트 클릭 시 드릴다운 대상으로 유지 | 보존 |
| 매출 내역 인쇄 | 구현(실효성 없음, A5-3) | `revenue-dashboard.tsx:290` `window.print()` | 동일 버튼 + **매출 전용 `@media print` 블록 신설** | 강화. 현재 실효 없는 구현을 실제 동작으로 |
| 계정/매출 출력 | 구현 | CSV data URL `:217` | 동일 버튼. 서버 집계 결과 기반, `useMemo` 적용 | 보존 + 성능 수정 |
| 디자이너별 매출 | 원장 1인 대체 | 전 거래가 `operator: "원장"` | 무변경 | 승인된 대체 유지 |
| 디자이너 인센티브 계산 | 원장 1인 대체 | 무변경 | 무변경 | 승인된 대체 유지 |
| VAT / 인센티브 / 샵 수익 (분석 항목으로서) | 사용자 승인 제외 | 정산 표에 표시만 | 무변경 | 승인 제외 유지 (표시는 계속) |

## B2. 결제 등록 (간접 영향 — 진입 동선만 변경)

| FUNCTION.md 기능 | 상태 | 현행 | 재설계 후 | 보존 방식 |
|---|---|---|---|---|
| 회원/비회원 선택 · 시술 대분류/상세/스타일명 · 고객 검색 연동 · 최종 결제금액 수정 · 결제 수단별 금액(현금/현금영수증/카드/이체/N페이/기타/지역페이) · 포인트 적립 · 메모 150자 · 선택/약품/두피/모발 메모 · 결제일·시간 · SMS 발송 여부 · VAT 포함/별도 · 할인율 · 수수료 · 결제 저장 | 구현 (17행) | `?tab=payment` → `PaymentForm` | **무변경.** `PaymentForm`과 `app/payment-actions.ts`는 건드리지 않는다 | 무변경 |
| 결제 등록 진입 | 구현 | 2차 탭 pill | 동일 탭 유지 + 대시보드 상단 1차 액션으로 **추가** 노출 | 확장 (기존 경로 제거 없음) |

## B3. 지출·정산

| FUNCTION.md 기능 | 상태 | 현행 | 재설계 후 | 보존 방식 |
|---|---|---|---|---|
| 기간별 지출 조회 `[추가확인]` | 구현 | `?tab=expenses` → `OperationsPage` | 무변경 | 무변경 |
| 매출·지출 조정/정산 | 구현 | 동일 | 무변경 | 무변경 |

## B4. 대시보드 연계

| FUNCTION.md 기능 | 상태 | 현행 | 재설계 후 | 보존 방식 |
|---|---|---|---|---|
| 매출액 기준 우수/특별 고객 검색 | 구현 | `app/customers/page.tsx` | 무변경 | 재설계 범위 밖 |
| 대기 고객 선택 시 회원 결제 화면으로 이동 | 구현 | `dashboard-page.tsx` → `/sales?tab=payment&customer=` | 무변경 (URL 계약 유지) | 무변경 |
| 등록 회원이면 결제 화면으로 이동 | 구현 | `customers-page.tsx` → 동일 URL | 무변경 | 무변경 |

---

## B5. URL 계약 (깨면 안 되는 것)

`Observed` — 다음 URL은 다른 화면에서 하드코딩되어 진입한다. 재설계는 전부 유지해야 한다.

| URL | 진입처 | 근거 |
|---|---|---|
| `/sales?tab=payment&customer=<id>` | 대시보드 대기 고객, 고객 목록 | `app/sales/page.tsx:24-28` |
| `/sales?tab=payment&correction=<ledgerId>` | 거래 기록 정정 링크 | `app/sales/transactions/page.tsx` |
| `/sales?tab=expenses` | 지출·정산 탭 | `app/sales/page.tsx:23` |
| `/sales?view=<v>&cursor=<date>` | 기간 이동 링크 | `revenue-query.ts:serializeRevenueQuery` |
| `/sales/transactions?...&selection=<kind>&selectionKey=<key>` | 차트 클릭 드릴다운 | `app/sales/transactions/page.tsx` |

**신규 추가 (기존과 충돌 없음):** `view=year`, `selection=month`.

---

## B6. 미해결

| 항목 | 상태 |
|---|---|
| `기간별 매출 [추가확인]` — 레거시의 "기간"이 임의 시작·종료일 지정인지 프리셋인지 미확정 | `Requires verification`. 현행 4뷰 프리셋을 유지하고 임의 범위는 만들지 않는다 |
| `두피 상태·모발 특징 메모 [추가확인]` | 재설계 범위 밖. `PaymentForm` 무변경으로 보존 |
| `쿠폰 판매·차감 매출 반영 [추가확인]` | 사용자 승인 제외. 유지 |
