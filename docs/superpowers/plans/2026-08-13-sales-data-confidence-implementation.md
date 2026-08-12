# Sales Data Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원본 이관 데이터의 서비스·결제수단·시간대 결손을 분석 UI에서 차단하고, 별도 더미 DB로 완전한 매출 감사 환경을 만든다.

**Architecture:** `lib/revenue-data.ts`가 기간 내 원장 레코드에서 차원별 데이터 신뢰도를 결정해 `RevenueAnalyticsView`로 전달한다. `SalesPage`는 시간대 신뢰도를 같은 서버 원장 범위에서 계산해 브리핑에 전달하고, `RevenueDashboard`는 가용 차원만 기존 차트로 렌더링한다. 더미 생성은 복제 DB만 수정하고 원본 경로를 거부한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Vitest, SQLite (`node:sqlite`), Tailwind CSS, Playwright CLI.

## Global Constraints

- `FUNCTION.md` §3.2 및 §3.5의 매출/정산 동작을 보존한다.
- 금액·정산·CSV·인쇄는 기존 서버 집계 정본을 계속 사용한다.
- 기본 `.data/hairhaeyo.sqlite`를 더미로 수정하거나 더미 DB를 Git에 추가하지 않는다.
- 데스크톱 1440px와 최소 1280px를 검증하며 모바일 UI는 만들지 않는다.
- 구현 전에는 각 동작의 실패 테스트를 실행해 RED를 확인한다.

---

### Task 1: 분석 차원 신뢰도 모델과 원본 데이터 차단

**Files:**
- Modify: `components/sales/revenue-analytics.ts`
- Modify: `lib/revenue-data.ts`
- Modify: `lib/revenue-data.test.ts`

**Interfaces:**
- Produces: `AnalyticsAvailability = { service: boolean; payment: boolean }` on `RevenueAnalytics` and `RevenueAnalyticsView`.
- Consumes: `RevenueTransaction.service` and `RevenueTransaction.paymentAmounts` produced from the immutable ledger range.

- [ ] **Step 1: Write failing availability tests**

```ts
it("marks fallback-only services and payment methods unavailable without changing money totals", () => {
  const analytics = buildRevenueAnalytics(rawImportedTransactions, { view: "month", cursor: "2026-08-12" }, "2026-08-12");
  expect(analytics.availability).toEqual({ service: false, payment: false });
  expect(analytics.settlement.find((row) => row.name === "총 매출")?.value).toBe(362000);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- lib/revenue-data.test.ts`

Expected: FAIL because `availability` is not defined.

- [ ] **Step 3: Add the minimal server-side availability calculation**

```ts
const availability = Object.freeze({
  service: records.some((record) => record.service !== "미분류" && record.service !== "기타"),
  payment: records.some((record) => Object.keys(record.paymentAmounts).some((name) => name !== "기타")),
});
```

Return it with the existing analytics object; do not change money aggregation or transaction rows.

- [ ] **Step 4: Run focused tests and type check**

Run: `npm test -- lib/revenue-data.test.ts && npm run typecheck`

Expected: PASS.

### Task 2: 시간대 신뢰도 모델과 dashboard data-quality states

**Files:**
- Modify: `lib/salon-briefing.ts`
- Modify: `lib/salon-briefing.test.ts`
- Modify: `app/(shell)/sales/page.tsx`
- Modify: `components/sales/revenue-dashboard.tsx`
- Modify: `components/sales/revenue-dashboard.test.tsx`

**Interfaces:**
- Produces: `isUsableHourPattern(rows): boolean` and `RevenueBriefing.availability.hour`.
- Consumes: `RevenueAnalyticsView.availability` and server-produced hour rows.

- [ ] **Step 1: Write failing tests for a single fixed import hour and unavailable dashboard states**

```ts
expect(isUsableHourPattern([{ hour: 21, count: 89 }])).toBe(false);
expect(renderToStaticMarkup(<RevenueDashboard analytics={rawAnalytics} briefing={rawBriefing} chart={dayChart()} query={query} />))
  .toContain("원본 정보 없음");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- lib/salon-briefing.test.tsx components/sales/revenue-dashboard.test.tsx`

Expected: FAIL because the predicate and unavailable state do not exist.

- [ ] **Step 3: Implement the minimal state rendering**

Add a non-interactive, labelled card used only for unavailable service/payment/hour dimensions. It must say `원본 정보 없음`, explain that the field was not included in the imported record and will be restored during data migration, and state that amount-based sales/settlement remain available. Do not render buttons, bars, alternative tables, or synthetic rankings in unavailable cards.

- [ ] **Step 4: Pass availability from `SalesPage` and retain valid dimensions**

Compute hour availability on the server from `hourLedger`; retain weekday, customer, KPI, trend and settlement rendering. Service/payment availability comes from analytics.

- [ ] **Step 5: Run focused tests and type check**

Run: `npm test -- lib/salon-briefing.test.ts components/sales/revenue-dashboard.test.tsx && npm run typecheck`

Expected: PASS.

### Task 3: Separate deterministic demo database creation

**Files:**
- Modify: `scripts/seed-analytics-dummy.mjs`
- Create: `scripts/verify-analytics-dummy.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a demo SQLite file supplied as an explicit output path.
- Consumes: an explicit source SQLite path and existing deterministic SQL.

- [ ] **Step 1: Write a failing isolated script test**

```js
assert.notEqual(source, target);
execFileSync(process.execPath, ["scripts/seed-analytics-dummy.mjs", source, target]);
assert.equal(readService(source), "미분류");
assert.notEqual(readService(target), "미분류");
```

- [ ] **Step 2: Run it and verify RED**

Run: `node scripts/verify-analytics-dummy.mjs`

Expected: FAIL because the script currently mutates its first/default argument in place.

- [ ] **Step 3: Copy before applying SQL and reject source=target**

Require `<source-db> <demo-db>`, create the demo parent directory, copy with `copyFileSync`, and fail when resolved paths are equal. Add the demo directory to `.gitignore`.

- [ ] **Step 4: Run the script test and prove original-versus-demo separation**

Run: `node scripts/verify-analytics-dummy.mjs`

Expected: PASS with source unchanged and demo enriched.

### Task 4: Execute the hard audit and write HTML report

**Files:**
- Create: `docs/audit/salon-analytics-hard-audit.html`
- Modify: `docs/audit/salon-analytics-hard-audit.md`
- Modify: `docs/audit/salon-analytics-metric-dictionary.md`
- Create: `output/playwright/sales-audit/` audit captures (ignored)

**Interfaces:**
- Consumes: original DB app run and a separately generated demo DB app run.
- Produces: an HTML report containing evidence links, every `sales-audit.md` checklist step, verified/blocked status, and unimplemented change recommendations.

- [ ] **Step 1: Run original-data state checks**

Run focused unit tests, launch the app against the original DB, and capture default, date/period, empty, error, keyboard, detail, print/CSV states at 1440px and 1280px.

- [ ] **Step 2: Build an ignored demo DB and run demo-data checks**

Run `node scripts/seed-analytics-dummy.mjs .data/hairhaeyo.sqlite .data/demo/sales-audit.sqlite`, launch the app with that explicit DB, and capture the same analytical states. Verify that original DB money and raw dimensions remain unchanged.

- [ ] **Step 3: Reconcile the metric dictionary and hard-audit findings**

Trace each observed metric to schema/query/server/frontend. Mark real runtime error behavior as verified or explicitly not verified; do not substitute a visual assertion.

- [ ] **Step 4: Create the HTML audit report**

Use semantic HTML with a compact desktop layout, fixed finding IDs, severity, exact evidence image paths, status, and recommendation. Include every checklist heading from `sales-audit.md`; make clear which recommendations are not yet implemented.

- [ ] **Step 5: Validate audit outputs**

Run: `npm test && npm run typecheck && npm run build`; inspect HTML in a browser and capture it. Record existing unrelated failures separately if they recur.

### Task 5: Handoff for approval and scoped follow-up

**Files:**
- Modify: `docs/audit/salon-analytics-hard-audit.html` only if visual QA finds a report defect.

- [ ] **Step 1: Report implementation evidence and the HTML file path**

State what is implemented (data-quality gating and demo isolation), what was audited, and list only remaining UI/product recommendations.

- [ ] **Step 2: Wait for user approval before implementing audit recommendations**

Do not alter future-period, business-date, or login redirect behavior without explicit selection.

- [ ] **Step 3: After approved recommendation fixes, write separate release notes and commit/push**

Create a separate documentation record and make an intentional commit containing only approved changes. Push only after final verification.
