-- 매출 분석용 더미 보강.
--
-- 가져온 원장 5,576행은 금액만 진짜고 분석에 필요한 칸이 비어 있다:
--   details.serviceMajor  = 전 행 "미분류"      → 시술 분석 불가
--   details.paymentMethods= 전 행 {"other":…}   → 결제 수단 분석 불가
--   occurred_at 의 시각    = 전 행 12:00        → 시간대 분석 불가
--
-- 이 스크립트는 **금액은 한 원도 건드리지 않고** 위 세 칸만 채운다.
-- 시술은 금액대로 정한다(커트가 펌 값을 받는 일이 없도록). 결제 수단과 시각은
-- rowid 에서 뽑은 값이라 몇 번을 돌려도 같은 결과가 나온다 — 무작위가 아니다.
--
-- 실행: node scripts/seed-analytics-dummy.mjs

UPDATE ledger
SET details = json_set(
  details,

  -- 시술: 금액대로 나눈다. 실제 분포(p50 ₩18,000 · p75 ₩55,000 · p90 ₩90,000)에 맞췄다.
  '$.serviceMajor',
  CASE
    WHEN gross_won <  20000 THEN CASE rowid % 10 WHEN 0 THEN '드라이' ELSE '커트' END
    WHEN gross_won <  40000 THEN CASE rowid % 3  WHEN 0 THEN '클리닉' WHEN 1 THEN '드라이' ELSE '커트' END
    WHEN gross_won <  80000 THEN CASE rowid % 4  WHEN 0 THEN '클리닉' ELSE '컬러' END
    WHEN gross_won < 150000 THEN CASE rowid % 3  WHEN 0 THEN '매직'   ELSE '펌' END
    ELSE                         CASE rowid % 2  WHEN 0 THEN '세트메뉴' ELSE '매직' END
  END,

  -- 결제 수단: 카드가 다수인 동네 미용실 비율(카드 6 · 현금 2 · 이체 1 · N페이 1).
  -- 한 건은 한 수단으로 전액 결제한다 — 분할 결제는 원장에 근거가 없다.
  '$.paymentMethods',
  json_object(
    CASE rowid % 10
      WHEN 0 THEN 'cash'  WHEN 1 THEN 'cash'
      WHEN 2 THEN 'transfer'
      WHEN 3 THEN 'naverPay'
      ELSE 'card'
    END,
    amount_won
  ),

  -- 방문 시각: 서울 10~19시. UTC+9 이고 영업일이 서울 09:00 에 시작하므로
  -- UTC 01~10시는 전부 같은 영업일에 떨어진다 — 날짜별 집계가 흔들리지 않는다.
  -- 20칸 표로 오후를 두껍게 준다. 균등 분포는 "한가한 시간대"를 못 만들어 분석이 무의미해진다.
  '$.visitHourSeoul',
  CASE (rowid * 7) % 20
    WHEN  0 THEN 10 WHEN  1 THEN 10
    WHEN  2 THEN 11 WHEN  3 THEN 11 WHEN  4 THEN 11
    WHEN  5 THEN 12 WHEN  6 THEN 12
    WHEN  7 THEN 13 WHEN  8 THEN 13 WHEN  9 THEN 13
    WHEN 10 THEN 14 WHEN 11 THEN 14 WHEN 12 THEN 14
    WHEN 13 THEN 15 WHEN 14 THEN 15 WHEN 15 THEN 15
    WHEN 16 THEN 16 WHEN 17 THEN 16
    WHEN 18 THEN 17
    ELSE 18
  END
)
WHERE kind != 'expense';

-- occurred_at 의 시각도 같은 값으로 맞춘다. 날짜 부분(=영업일)은 그대로 둔다.
UPDATE ledger
SET occurred_at = substr(occurred_at, 1, 11)
  || printf('%02d', json_extract(details, '$.visitHourSeoul') - 9)
  || substr(occurred_at, 14)
WHERE kind != 'expense' AND json_extract(details, '$.visitHourSeoul') IS NOT NULL;
