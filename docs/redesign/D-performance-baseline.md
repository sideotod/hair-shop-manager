# 산출물 D — 현행 성능 측정 결과

전부 `Measured`. 측정일 2026-08-06.

---

## D1. 측정 환경

| 항목 | 값 |
|---|---|
| 빌드 | `next build` (프로덕션, Turbopack) |
| 서버 | `next start` :3100, 인증 세션 |
| 브라우저 | Playwright Chromium, 1440×900 및 1280×800 |
| DB | 실제 `.data/hairhaeyo.sqlite` |
| HTTP 측정 | 인증된 in-page `fetch(..., {credentials:"same-origin"})`, 3회 중앙값 |
| DOM 측정 | iframe Navigation Timing + `querySelectorAll` |
| Node 벤치 | Vitest 인프로세스, `process.hrtime.bigint()` |

**주의:** 비인증 curl 측정은 HTTP 307 리다이렉트(15–35 byte)로 무의미했다. 위 방식으로 재측정한 값만 기록한다.

---

## D2. HTTP 응답 (프로덕션, 중앙값 3회)

| 경로 | 시간 | 페이로드 |
|---|---|---|
| `/` | 599ms | 454 KB |
| `/sales` | 629ms | 75 KB |
| `/sales?view=day&cursor=2026-08-06` | 278ms | 66 KB |
| `/sales?view=week&cursor=2026-08-06` | 362ms | 71 KB |
| `/sales?view=month&cursor=2026-08-06` | 413ms | 75 KB |
| **`/sales?view=total&cursor=2026-08-06`** | **1,843ms** | **3,934 KB** |
| `/customers` | 751ms | 1,644 KB |
| `/bookings` | 404ms | 462 KB |
| `/sales/transactions` | 569ms | 109 KB |
| `/messages` | 429ms | 1,143 KB |
| `/operations` | 384ms | 445 KB |

**함정:** `?view=total` 단독(커서 없음)은 481ms / 75KB로 측정된다. `revenue-query.ts:68`이 커서 없는 view를 버리고 월별로 폴백하기 때문이다(A3-4). 위 표의 누적 값은 커서를 붙여 재측정한 실제 값이다.

---

## D3. DOM (1440×900, 프로덕션)

| 경로 | load | TTFB | DOM 노드 | tabbable |
|---|---|---|---|---|
| `/` | 1,065ms | 601ms | 2,165 | **887** |
| `/sales` | 999ms | — | 427 | 38 |
| **`/sales?view=total&cursor=…`** | **4,525ms** | **3,665ms** | **10,381** | 1,697 |
| `/customers` | 1,539ms | 745ms | **10,920** | **2,625** |
| `/bookings` | 632ms | — | 2,167 | 907 |
| `/messages` | 1,115ms | — | 5,513 | 1,750 |
| `/sales/transactions` | 706ms | — | 559 | 100 |

---

## D4. 서버 내부 비용 분해

| 단계 | 시간 |
|---|---|
| `createSalonStore()` | 8.3ms |
| `store.snapshot()` | 162–218ms |
| ├ `list("customers")` | 4.3ms |
| ├ `listLedger()` (5,576행) | 47.6ms |
| └ audit_events (6,435행) | — JSON **2,079,962 bytes** |
| `buildRevenueTransactions()` | 78.9ms |
| `buildRevenueAnalytics(month)` | 3.4ms |
| **`buildRevenueAnalytics(total)`** | **998.1ms** |

직렬화 크기:

| 뷰 | JSON bytes | trend 포인트 | 거래 행 |
|---|---|---|---|
| 월별 | 4,033 | **3** | 11 |
| 누적 | **1,788,664** | 1,662 | 5,576 |

---

## D5. 대안 — 직접 SQL 집계

같은 DB, `node:sqlite`, 읽기 전용:

| 쿼리 | 시간 | 행 | bytes |
|---|---|---|---|
| `GROUP BY substr(occurred_at,1,7)` (2026년 월별) | **5.2ms** | 8 | **280** |
| `GROUP BY substr(occurred_at,1,10)` (2026-08 일별) | **3.0ms** | 3 | — |
| `GROUP BY substr(occurred_at,1,4)` (전체 연도별) | **4.2ms** | 7 | — |

**대비:** 누적 뷰 998.1ms / 1,788,664 bytes → 월별 SQL 집계 5.2ms / 280 bytes. 시간 약 190배, 페이로드 약 6,400배 차이.

---

## D6. 병목 판정

**결론: 서버 집계 + 페이로드가 병목이다. 클라이언트 차트 렌더링이 아니다.**

근거:
1. 느린 두 경로에서 TTFB가 전체 로드 시간의 대부분을 차지한다 — 누적 3,665/4,525ms (81%), 고객 745/1,539ms (48%).
2. 인프로세스 벤치가 그 TTFB를 설명한다 — snapshot 162ms + buildTx 79ms + totalAnalytics 998ms ≈ 1,240ms에 직렬화·전송이 더해진다.
3. 페이로드가 1.79MB다. 이것은 서버 → 클라이언트 RSC 페이로드로 그대로 전송된다.

**따라서:**
- `/sales` 가상화(virtualization)는 **이 데이터로 정당화되지 않는다.** DOM 노드가 문제라면 TTFB가 아니라 load−TTFB 구간이 커야 한다. 누적 뷰의 렌더 구간은 860ms로 TTFB의 1/4이다.
- 근본 수정은 **서버 집계 도입 + snapshot에서 audit_events 제외 + `occurred_at` 인덱스**다 (산출물 F).
- `/customers`는 TTFB 48%·DOM 10,920 노드로 **혼합형**이다. 매출 재설계와 분리하여 별건 처리한다.

---

## D7. 인덱스 실태

`lib/salon-store.ts:192` — ledger의 유일한 비자동 인덱스:

```sql
CREATE UNIQUE INDEX ledger_one_reversal_per_original
  ON ledger(correction_of) WHERE kind IN ('refund','correction');
```

`occurred_at`에 인덱스가 없다. `listLedger()`(`:404`)는 `SELECT * FROM ledger ORDER BY occurred_at, rowid` — 술어 없는 전체 스캔 + 정렬.

현재 5,576행에서 47.6ms는 견딜 만하다. 범위 술어를 쓰는 집계 쿼리를 도입하면 인덱스가 필요해진다.

---

## D8. 재측정 기준

개선 후 동일 조건으로 다시 잰다. 비교 대상:

```
/sales?view=month&cursor=2026-08-06   413ms / 75KB      → 목표 < 300ms
/sales?view=total&cursor=2026-08-06  1843ms / 3934KB    → 목표 < 400ms / < 200KB
/sales 누적 DOM 노드                  10,381            → 목표 < 2,000
buildRevenueAnalytics(total)          998.1ms           → 제거 (SQL로 대체)
```

**"빨라졌다"는 이 표를 다시 채운 뒤에만 말한다.**

---

## D9. 재측정 결과 (Measured, 2026-08-06)

D1과 동일한 조건: `npm run build` 후 `next start -p 3100`, 원장 계정으로 로그인한 페이지 안에서
`fetch(url, { credentials: 'same-origin', cache: 'no-store' })` 4회 실행, 첫 회 버리고 3회 중앙값.
DOM 노드는 `document.getElementsByTagName('*').length`.

| 대상 | 이전 | 이후 | 목표 | 판정 |
| --- | --- | --- | --- | --- |
| `/sales?view=month&cursor=2026-08-06` | 413ms / 75KB | **84ms / 112KB** | < 300ms | 달성 |
| `/sales?view=total&cursor=2026-08-06` | 1,843ms / 3,934KB | **241ms / 200KB** | < 400ms / < 200KB | 달성 |
| `/sales` 누적 DOM 노드 | 10,381 | **813** | < 2,000 | 달성 |
| `buildRevenueAnalytics(total)` | 998.1ms | **241ms 안에 흡수** | 제거 | 달성 |

부가 측정: `?view=day` 81ms / 111KB, `?view=week` 90ms / 112KB, `/sales` 79ms / 112KB,
`/sales/revenue-csv?view=month&cursor=2024-06-01` **25ms / 6KB**.

월 페이로드가 75KB → 112KB로 커진 것은 회귀가 아니다. 기준선에 없던 §11.1·11.2·11.3 서버 집계
차트 세 개가 이제 실려 있다. 200KB 상한 아래다.

무엇이 무엇을 고쳤는지 (Measured):

- 페이로드(3,934KB → 200KB): CSV를 서버 라우트로 분리 + `Omit<RevenueAnalytics, "transactions">`.
  이 단계만으로는 시간이 1,938ms에 머물렀다 — 서버가 여전히 5,576행을 매 요청 조립했다.
- 시간(1,938ms → 241ms): `lib/revenue-data.ts`의 O(n·m) 스캔 두 곳을 단일 패스 `Map` 그룹핑으로 교체.
  누적 기간에서 날짜마다 전체를 `filter` 하면 1,662일 × 5,576행이었다.
- 둘 다 필요했다. 어느 한쪽만으로는 목표를 넘지 못한다.

### D9-1. 새로 발견한 병목 — `/sales/transactions?view=total`

D2는 커서 없는 `/sales/transactions`만 쟀고 109KB로 보였다. `revenue-query.ts:68`이 커서 없는 view를
버리고 month로 되돌리기 때문이다. 누적 기간을 명시하면 5,576행이 HTML 표 하나에 전부 들어간다.

| 대상 | 이전 | 이후 (Measured) |
| --- | --- | --- |
| `/sales/transactions?view=total&cursor=2026-08-06` | 2,319ms / 19,700KB | **424ms / 1,126KB** |
| 같은 URL 렌더된 행 수 | 5,576 | **300** |
| 같은 URL DOM 노드 (1440 / 1280) | — | **6,740 / 6,614** |
| `/sales/transactions?view=month&cursor=2026-08-06` | — | **46ms / 110KB** (11행) |

860행이라는 이유만으로 페이지네이션을 일괄 적용하지 말라는 §제약을 지켜, 측정한 뒤에만 상한을 걸었다
(`ROW_LIMIT = 300`, `app/sales/transactions/page.tsx:15`). 자르되 숨기지 않는다 — 잘린 사실을 세 곳에
적는다 (도입 문장, `CSV 전체` 링크, 표 하단 행). 1440·1280 양쪽에서 확인:

```
전체 5,576건 중 최근 300건입니다. 이전 거래는 기간을 좁히거나 CSV로 확인하세요.
선택 기간의 개별 거래를 환불·정정합니다. 최근 300건만 표시합니다 — 전체는 CSV로 내려받으세요.
CSV 전체 → /sales/revenue-csv?view=total&cursor=2026-08-06
```

양쪽 폭에서 `overflowX: false`, `scrollWidth == innerWidth`.

남은 1,126KB는 300행 자체가 아니라 RSC 페이로드다 (`<script>` 조각 하나가 422KB). 300행 표의 응답으로는
여전히 크다. 행별 `<form>`·`<Link>` 때문일 가능성이 높지만 **Hypothesis — 미검증**.
