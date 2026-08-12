# Codex Hard Audit Master Brief

# 미용실 원장용 매출 분석 페이지

## UX · UI · 데이터 분석 적합성 · 비즈니스 유용성 종합 감사

---

# 0. 이번 작업의 목적

이번 작업은 **리디자인 작업이 아니다.**

현재 구현되어 있는 미용실 매출 분석 페이지가 실제 사용자에게 적합한지 아주 엄격하게 감사하는 것이 목적이다.

감사 대상은 크게 네 가지다.

1. **UX**
  - 데이터 분석을 잘 모르는 미용실 원장이 실제로 이해할 수 있는가?
2. **UI**
  - 정보 hierarchy와 시각 표현이 분석 목적에 맞는가?
3. **Data Analysis**
  - 현재 제공되는 통계와 insight가 실제 데이터 구조에 비추어 정확하고 의미 있는가?
4. **Business Fit**
  - 이 정보를 미용실 원장이 실제 매장 운영에 활용할 가치가 있는가?

단순히:

> “디자인이 깔끔합니다.”

> “차트를 하나 더 넣으면 좋겠습니다.”

같은 표면적인 평가를 하지 않는다.

이번 감사의 기준은 다음 질문이다.

> **데이터 분석에 익숙하지 않은 미용실 원장이 이 페이지를 실제로 사용했을 때, 자신의 매장 상태를 정확하고 빠르게 이해할 수 있는가?**

그리고 더 중요하게:

> **현재 페이지가 보여주는 분석 결과가 실제 SQL / Backend 데이터와 일치하며, 사용자를 잘못된 결론으로 유도하지 않는가?**

---

# 1. Audit Only가 기본이다

이번 작업에서는 기본적으로 기존 코드를 바로 수정하지 않는다.

먼저:

> 조사 → 검증 → 증거 수집 → 문제 분류 → 개선안 제안

까지만 수행한다.

사용자가 별도로:

> 수정해줘

라고 요청하지 않았다면 대규모 UI 변경이나 리팩토링을 바로 시작하지 않는다.

다만 감사 과정에서 발견한 문제의 원인을 확인하기 위한 최소한의 debugging / instrumentation은 가능하다.

---

# 2. 프로젝트 위치

Project Root:

```
확인필요
```

프로젝트 구조를 빠르게 파악하기 위한 `.codegraph`:

```
Project Root의 /.codegraph
```

`.codegraph`를 초기 navigation map으로 적극 활용한다.

그러나 실제 데이터와 동작에 대한 Source of Truth는 아니다.

---

# 3. Source of Truth 우선순위

분석 결과나 Metric의 의미를 판단할 때 다음 순서를 따른다.

1. 실제 SQL Schema / Migration
2. 실제 SQL Query
3. Backend Business Logic
4. API DTO / Response Schema
5. 실제 Runtime API Response
6. Frontend Transformation
7. Frontend UI
8. `.codegraph`
9. 외부 Reference

UI에 적힌 이름보다 실제 SQL과 Backend가 우선이다.

예를 들어 UI에:

> 수익

이라고 적혀 있더라도 실제 값이 단순 결제 총액이라면 이를 **매출**로 판단해야 한다.

---

# 4. 가장 먼저 Skills / Tools Preflight

작업 시작 전 현재 사용할 수 있는 Skills / Plugins / Browser Tools를 확인한다.

이번 감사에 우선적으로 사용할 Skill 후보:

## Product Design

- Product Design `audit`
- 필요할 때 Product Design 관련 context/research capability
- source visual target이 존재할 경우에만 `design-qa`

## Debugging / Verification

- `systematic-debugging`
- `verification-before-completion`
- 필요 시 `test-driven-development`

## Browser

- 실제 Browser / Browser Automation
- screenshot capture
- DOM inspection
- console
- network
- responsive viewport

## Code / Data

- codebase exploration
- SQL inspection
- backend trace
- frontend trace

---

# 5. Skill 사용 규칙

Skill 이름만 알고 있다고 가정하지 않는다.

현재 환경에서 실제 Skill이 존재하면 최신 Skill 문서를 읽고 workflow를 따른다.

특히 Product Design `audit`을 사용할 경우:

- 실제 브라우저 화면을 확인한다.
- 각 단계마다 screenshot / DOM evidence를 확보한다.
- 단순한 코드 추측으로 UX 판단을 하지 않는다.

---

# 6. Product Design `audit`을 핵심 감사 도구로 사용

이번 작업은 기존 제품의 사용성을 검토하는 것이므로 Product Design `audit`을 핵심으로 사용한다.

단순 screenshot critique가 아니다.

실제 앱에서 다음을 검증한다.

- 페이지 최초 진입
- 날짜 선택
- 기간 비교
- KPI 확인
- 차트 해석
- 메뉴/시술 분석
- 시간대 분석
- 고객 분석
- demographic
- 상세보기
- loading
- empty
- error
- mobile
- keyboard

각 단계마다:

```
현재 상태 확인
→ screenshot
→ DOM 확인
→ interaction
→ 결과 확인
→ screenshot
→ 결과 기록
```

순서로 증거를 남긴다.

---

# 7. `design-qa` 사용 조건

`design-qa`는 다음 경우에만 사용한다.

- Figma가 존재함
- 디자인 원본 screenshot이 존재함
- reference mockup이 존재함

목적:

> 디자인 원본과 실제 구현의 visual fidelity 검증

이다.

이번 Hard Audit의 UX 분석을 `design-qa`로 대체하지 않는다.

정리:

```
사용성 / 정보 이해 / 실제 Flow
→ audit

Figma 또는 원본 디자인과 구현 비교
→ design-qa
```

---

# 8. `.codegraph`를 먼저 조사한다

다음 경로를 확인한다.

```
C:/Users/이창민인턴사원/Desktop/vscode/web/.codegraph
```

먼저 top-level structure를 확인한다.

무작정 모든 파일을 context에 넣지 않는다.

다음 키워드를 중심으로 관련 component / API / backend를 찾는다.

```
analytics
analysis
stat
statistics
sales
revenue
income
dashboard
report
summary
reservation
appointment
payment
customer
gender
age
service
menu
treatment
designer
stylist
staff
```

한국어 identifier가 있다면:

```
매출
수익
분석
통계
예약
결제
시술
메뉴
고객
성별
연령
직원
디자이너
```

도 조사한다.

---

# 9. Frontend → Backend → SQL 전체 Data Flow를 추적한다

다음 연결을 실제 파일 기준으로 만든다.

```
Analytics Page
↓
Component
↓
Hook / Query
↓
API Client
↓
Backend Endpoint
↓
Service
↓
Repository / Query
↓
SQL / Database
```

각 주요 Metric에 대해 이 연결을 추적한다.

예:

```
총 매출
완료 시술
평균 결제금액
시술별 매출
성별 통계
연령 통계
요일별 매출
시간대별 매출
신규 고객
재방문 고객
```

---

# 10. 프로젝트 내 SQL을 적극적으로 조사한다

Project Root:

```
C:/Users/이창민인턴사원/Desktop/vscode/web
```

다음 자료를 찾는다.

- `*.sql`
- schema
- migration
- seed
- view
- stored procedure
- repository raw query
- ORM query
- DB initialization
- analytics query

`.codegraph`가 SQL 위치를 알려주면 적극 활용한다.

---

# 11. SQL에서 먼저 파악할 Entity

실제 이름 기준으로 다음과 유사한 Entity를 조사한다.

- shop / salon / store
- customer
- reservation
- appointment
- treatment
- service
- menu
- payment
- sale
- order
- designer
- stylist
- employee
- category
- refund
- discount
- membership
- coupon

실제 schema에 없는 Entity를 있다고 가정하지 않는다.

---

# 12. 미용실 Domain에서 가장 위험한 개념 혼동

Hard Audit에서 특히 다음을 강하게 검증한다.

---

## 예약 ≠ 방문

예약 생성 건수를 실제 방문 고객 수처럼 보여주는지 확인한다.

다음 상태가 있다면 구분한다.

- 예약 생성
- 예약 확정
- 방문 완료
- 시술 완료
- 취소
- 노쇼

---

## 예약 금액 ≠ 실제 매출

예약 시 표시된 시술 가격과 실제 결제 금액을 구분한다.

---

## 시술 완료 ≠ 결제 완료

데이터 모델에서 두 상태가 다르다면 명확히 구분한다.

---

## 매출 ≠ 이익

비용 데이터가 없다면:

- 이익
- 순이익
- profit

표현을 사용하는 것은 P0/P1 수준 문제로 검토한다.

---

# 13. Metric Dictionary를 작성한다

다음 형식의 문서를 만든다.

```
docs/audit/salon-analytics-metric-dictionary.md
```

형식:


| UI Metric | 실제 Source | 실제 정의 | 화면 Label | 정확성 | 문제  |
| --------- | --------- | ----- | -------- | --- | --- |


예:


|           |                                              |            |
| --------- | -------------------------------------------- | ---------- |
| UI Metric | DB Source                                    | Definition |
| 매출        | [payment.total](http://payment.total)_amount | 완료 결제 합계   |
| 방문        | appointments status=completed                | 완료 방문 건수   |


실제 코드에 맞게 작성한다.

---

# 14. Metric마다 반드시 검증할 것

각 Metric에 대해:

1. Source Table
2. Source Column
3. Filter
4. Status condition
5. Date field
6. Aggregation
7. Refund handling
8. Cancellation handling
9. Null handling
10. Frontend transformation
11. UI wording

을 추적한다.

---

# 15. 날짜 기준을 Hard Audit한다

매출 통계의 날짜가 무엇을 의미하는지 확인한다.

후보:

- 예약 생성일
- 예약 날짜
- 방문일
- 시술 완료일
- 결제일

예를 들어:

> 8월 매출

인데 reservation.created_at 기준이라면 심각한 문제다.

실제 business 의미에 맞는 날짜인지 검증한다.

---

# 16. 기간 비교를 매우 엄격하게 검증한다

예:

현재 날짜 범위:

```
8월 1일 ~ 8월 12일
```

이전 기간이:

```
7월 1일 ~ 7월 31일
```

이면 공정한 비교가 아닐 수 있다.

가능하면:

```
7월 1일 ~ 7월 12일
```

같은 동일 경과 기간을 사용해야 하는지 검토한다.

다음 비교 방식이 어디에 사용되는지 조사한다.

- 전일
- 전주
- 전월
- 이전 동일 길이 기간
- 전년 동기

UI에서 비교 기준이 명확한지 확인한다.

---

# 17. Percentage Change Edge Case

다음 케이스를 확인한다.

```
previous = 0
current > 0
```

이 경우:

```
+Infinity%
```

또는:

```
+999%
```

같은 오해 가능한 표현이 발생하지 않는지 확인한다.

---

# 18. Refund / Cancel 처리

매출에 다음이 어떻게 반영되는지 확인한다.

- 전체 환불
- 부분 환불
- 예약 취소
- 시술 취소
- 결제 취소

총 결제액만 합산하고 환불을 무시하면 심각한 데이터 오류일 수 있다.

---

# 19. 여러 시술이 하나의 결제에 포함되는 경우

하나의 방문에서:

- 커트
- 염색
- 클리닉

같이 여러 서비스가 결제될 수 있는지 SQL을 확인한다.

이 경우 서비스별 매출을 어떻게 배분하는지 검증한다.

잘못된 Join으로 전체 결제 금액을 각 시술에 중복 할당하면:

**P0 Data Integrity 문제**로 처리한다.

---

# 20. Join Duplication Audit

SQL에서 특히 다음을 확인한다.

```
payment
JOIN appointment_services
JOIN service
```

관계에서 결제 row가 service 수만큼 복제되지 않는지 확인한다.

`SUM(payment.amount)`가 잘못 중복되는 query가 없는지 검증한다.

---

# 21. 고객 Unique Count 검증

다음을 구분한다.

- 예약 건수
- 방문 건수
- 고객 수

같은 고객이 한 달에 4번 방문했다면:

```
방문 4건
고객 1명
```

이다.

UI가 이를 혼동하지 않는지 확인한다.

---

# 22. 평균 결제금액 / 객단가 Hard Audit

Average Ticket의 분모가 무엇인지 확인한다.

가능한 정의:

```
총 완료 결제 매출 / 완료 결제 건수
```

또는:

```
총 매출 / 완료 방문 건수
```

두 개는 다를 수 있다.

현재 제품에서 어떤 것을 사용해야 하는지 business logic을 확인한다.

UI wording도 정확해야 한다.

---

# 23. 신규 고객 정의 Audit

“신규 고객”을 어떻게 정의하는지 추적한다.

단순:

```
customer.created_at
```

기준이면 실제 첫 방문 고객과 다를 수 있다.

보다 합리적인 정의 후보:

> 해당 고객의 최초 완료 방문이 해당 기간에 존재

실제 제품의 기존 정의가 있다면 우선한다.

---

# 24. 재방문 고객과 재방문율을 구분한다

다음 두 지표는 다르다.

### Returning Customer Share

이번 기간 방문 고객 중 과거 방문 이력이 있는 고객 비중.

### Retention / Revisit Rate

특정 cohort가 일정 기간 내 다시 방문한 비율.

현재 데이터 구조가 cohort 계산을 지원하지 않는데 UI가:

> 재방문율 63%

이라고 표현하면 문제일 수 있다.

정확한 정의를 확인한다.

---

# 25. 미용실 특성상 재방문 분석 적합성을 검토

미용실은 시술마다 자연스러운 재방문 cycle이 다를 수 있다.

예:

- 커트
- 염색
- 펌
- 클리닉

각각 자연스러운 재방문 주기가 다르다.

현재 단순 30일 재방문율 등이 있다면 business적으로 적절한지 검토한다.

단, SQL에 충분한 데이터가 없으면 새로운 metric을 억지로 제안하지 않는다.

---

# 26. 서비스 / 시술별 분석 Hard Audit

다음 질문에 답할 수 있는지 확인한다.

> 어떤 시술이 가장 많은 매출을 만드는가?

> 어떤 시술이 가장 많이 수행되는가?

> 어떤 시술 매출이 증가하고 있는가?

각각 다른 Metric이다.

---

# 27. 매출 순위와 건수 순위를 혼동하지 않는다

예:

커트:

```
80건 × 30,000원
```

펌:

```
20건 × 150,000원
```

이면:

건수 1위와 매출 1위가 다를 수 있다.

UI가 이를 명확하게 구분하는지 확인한다.

---

# 28. 서비스별 증감 Hard Audit

현재 기간:

```
current_service_sales
```

이전 기간:

```
previous_service_sales
```

을 이용해:

```
delta = current - previous
```

가 정확한지 확인한다.

서비스가 이전 기간에는 존재하지 않았던 경우의 표현도 확인한다.

---

# 29. 시간대 분석 적합성

다음을 구분한다.

> 언제 예약이 많이 들어왔는가?

와

> 언제 실제 방문이 많았는가?

와

> 언제 매출이 높았는가?

는 모두 다르다.

현재 화면 제목과 실제 query가 일치하는지 검증한다.

---

# 30. 요일 분석 적합성

다음을 별도로 확인한다.

- 방문 건수 기준
- 매출 기준
- 예약 생성 기준

원장이 실제 운영에 활용하려면 Metric 의미가 명확해야 한다.

---

# 31. Gender 분석 Hard Audit

현재 프로젝트에 성별 데이터가 존재한다면 다음을 검증한다.

- 전체 고객 중 성별 known 비율
- unknown 비율
- null
- 미입력
- 기타 category
- 실제 방문 기준인지 회원 전체 기준인지

---

# 32. Unknown Gender를 숨기면 안 된다

예:

전체 방문 고객:

```
100명
```

known gender:

```
30명
```

여성:

```
20
```

남성:

```
10
```

이때:

```
여성 67%
남성 33%
```

만 보여주면 오해 가능성이 있다.

현재 UI가 이를 어떻게 처리하는지 확인한다.

---

# 33. Age 분석 Audit

연령 계산 기준을 확인한다.

- current age
- 만 나이
- birth year
- 방문 당시 연령

그리고 birthdate 없는 고객을 어떻게 처리하는지 확인한다.

표본이 작은데:

> 20대가 핵심 고객입니다.

라고 단정하는지도 검토한다.

---

# 34. Sample Size Hard Audit

Demographic / 서비스 / 시간대 통계는 작은 표본에서 매우 불안정할 수 있다.

예:

```
방문 고객 3명
```

인데:

> 여성 고객이 100%입니다.

같은 표현을 강하게 강조하는 것은 UX적으로 부적절할 수 있다.

현재 minimum sample handling이 있는지 조사한다.

---

# 35. 새로운 Threshold를 임의로 만들지는 않는다

기존 privacy / business rule이 있다면 따른다.

없다면:

> 최소 N명 이상일 때만 표시

같은 개선 제안을 할 수 있다.

그러나 감사 중 임의 N을 product requirement처럼 확정하지 않는다.

---

# 36. Insight Accuracy Audit

현재 페이지에 자연어 insight가 있다면 모두 검토한다.

각 insight마다:

```
문장
↓
사용 데이터
↓
계산식
↓
실제 결과
```

를 확인한다.

---

# 37. Causal Claim Hard Audit

다음은 강하게 검증한다.

위험:

> 여성 고객이 늘어서 매출이 증가했습니다.

> 염색 고객 증가 때문에 이번 달 매출이 상승했습니다.

> 토요일 예약 증가가 매출 성장의 원인입니다.

단순 상관관계만 가지고 원인으로 표현하면 안 된다.

가능:

> 여성 고객 비중과 전체 매출이 모두 증가했습니다.

> 염색 매출 증가분이 시술 중 가장 컸습니다.

관찰 가능한 사실과 causal inference를 구분한다.

---

# 38. “좋음 / 나쁨” 판단의 적합성

현재 UI가:

- 좋음
- 나쁨
- 위험
- 성공

등의 상태를 자동 판정한다면 그 기준을 조사한다.

예:

```
매출 +1%
→ 매우 좋음
```

같은 arbitrary threshold가 없는지 확인한다.

---

# 39. 데이터 분석이 “있기만 한 정보”인지 검토한다

통계가 기술적으로 정확해도 원장에게 가치가 없을 수 있다.

각 분석 영역에 다음 질문을 한다.

> 원장이 이 정보를 보고 무엇을 이해할 수 있는가?

> 운영 판단에 어떤 도움을 주는가?

> 이 정보보다 더 중요한 정보가 빠져 있지는 않은가?

---

# 40. 미용실 원장 관점의 Business Value Audit

아래 질문을 기준으로 현재 화면을 평가한다.

## Sales

- 이번 달 장사가 잘되고 있는가?

## Services

- 어떤 시술이 매출을 만들고 있는가?

## Customers

- 신규 고객은 들어오고 있는가?
- 기존 고객은 다시 방문하고 있는가?

## Time

- 언제 매장이 바쁜가?

## Operations

- 예약 취소 / 노쇼가 문제인가?

실제 데이터가 지원하는 항목만 평가한다.

---

# 41. 10초 Comprehension Test

Persona:

> 매장에서 고객 응대와 시술까지 직접 하는 미용실 원장.  
> 데이터 분석 경험은 거의 없다.

페이지를 처음 열고 10초 안에 다음 질문에 답할 수 있어야 하는지 평가한다.

1. 이번 기간 매출은 얼마인가?
2. 이전 기간보다 좋아졌는가?
3. 지금 가장 중요한 변화는 무엇인가?

결과:

```
PASS
PARTIAL
FAIL
```

과 이유를 기록한다.

---

# 42. 30초 Comprehension Test

30초 안에 실제 데이터가 지원하는 범위에서 다음을 찾을 수 있는지 평가한다.

- 매출
- 방문/완료 시술
- 평균 결제금액
- 인기 시술
- 성장/감소 시술
- 바쁜 요일/시간
- 신규/재방문
- 고객 특성

각각:

```
즉시 이해
찾으면 이해
해석 필요
찾기 어려움
제공되지 않음
```

으로 평가한다.

---

# 43. UI Information Hierarchy Audit

다음 순서를 평가한다.

사용자가 첫 화면에서 무엇을 먼저 보는가?

1. 중요 business signal
2. 핵심 숫자
3. 비교
4. 상세 분석

인지,

아니면:

1. 장식
2. filter
3. chart
4. legend
5. 중요한 숫자

순인지 확인한다.

---

# 44. KPI 개수 Audit

KPI가 많다고 좋은 것이 아니다.

각 KPI마다 질문한다.

> 이 숫자는 미용실 원장이 10초 안에 알아야 하는가?

그렇지 않다면 상세 분석으로 내리는 것이 더 적절한지 제안한다.

---

# 45. Card Wall Audit

화면이 다음 구조인지 확인한다.

```
card
card
card
card
card
card
chart card
chart card
chart card
```

모든 내용을 독립 카드로 분리하면 information hierarchy가 약해질 수 있다.

`frontend-design` / Product Design 관점에서 평가한다.

---

# 46. Chart Necessity Audit

모든 Chart에 대해 다음 질문을 한다.

> 이 Chart가 없어도 한 문장으로 핵심을 전달할 수 있는가?

가능하다면:

```
Summary
+
Optional chart/detail
```

구조가 더 적합한지 제안한다.

---

# 47. Chart Type Audit

각 Chart를 실제 목적에 따라 평가한다.

### Time series

Line Chart가 적절한가?

### Service ranking

Horizontal Bar가 적절한가?

### Gender

Stacked Bar / 단순 비율이 더 나은가?

### Weekday

Bar가 적절한가?

### Weekday × Time

Heatmap이 실제로 필요한가?

---

# 48. 피해야 할 Visualization 체크

다음이 있다면 강하게 검토한다.

- 3D chart
- radar
- gauge
- dual Y-axis
- 지나치게 많은 line
- pie/donut 남발
- 매우 작은 chart
- decorative sparkline
- 의미 없는 gradient
- color만으로 비교

---

# 49. Chart Title Audit

다음과 같은 technical title을 찾는다.

```
Revenue Distribution
Customer Segmentation
Sales Performance
MoM Growth
Service Mix
```

일반 사용자에게:

```
매출은 어떻게 변하고 있나요?
어떤 시술이 잘 팔렸나요?
어떤 고객이 많이 방문했나요?
```

같은 질문형 표현이 더 적절한지 검토한다.

---

# 50. Chart Explanation Audit

사용자가 legend와 axis만 보고 분석해야 하는지 확인한다.

가능하면 화면이:

```
핵심 설명
↓
Chart
↓
Detail
```

구조인지 평가한다.

---

# 51. Filter Complexity Audit

현재 filter 수를 조사한다.

예:

- 날짜
- 시술
- 고객 성별
- 연령
- 디자이너
- 카테고리

첫 화면에서 너무 많은 filter를 요구하는지 확인한다.

개인사업자 대상 제품이라면 progressive disclosure가 더 적합한지 평가한다.

---

# 52. Default State Audit

페이지에 처음 들어왔을 때 사용자가 아무 설정을 하지 않아도 유용해야 한다.

기본 기간과 비교 대상이 합리적인지 확인한다.

---

# 53. Mobile Hard Audit

미용실 원장이 휴대전화로 볼 가능성을 고려한다.

대표 mobile viewport에서 실제로 확인한다.

- KPI
- 날짜 선택
- insight
- chart
- service ranking
- customer
- filter
- tooltip
- horizontal scroll
- touch target

---

# 54. Desktop Audit

Desktop에서도:

- 과도한 빈 공간
- 너무 많은 card
- chart width
- label 가독성
- section hierarchy

를 확인한다.

---

# 55. Accessibility Hard Audit

Product Design + accessibility 관점에서 최소한 다음을 확인한다.

- headings
- button semantics
- links
- keyboard
- focus
- tab order
- contrast
- touch target
- aria-expanded
- selected state
- labels
- chart alternatives
- color-only meaning

---

# 56. Increase / Decrease 표현

증가/감소가 색상만으로 표현되지 않는지 확인한다.

예:

```
↑ 12.4%
지난달 같은 기간보다 증가
```

같은 redundancy가 접근성에 더 적합하다.

---

# 57. Loading Audit

다음 문제를 확인한다.

- skeleton이 너무 오래 유지
- 전체 페이지 block
- section별 독립 loading 없음
- data loading 중 0으로 표시

특히 loading 중:

```
매출 0원
```

으로 잠시 보여주는 것은 misleading할 수 있다.

---

# 58. Empty State Audit

데이터가 없는 경우:

빈 chart나:

```
0
```

만 보여주고 있지 않은지 확인한다.

더 적절한 표현:

> 아직 이번 기간 완료된 시술이 없어요.

등.

---

# 59. Sparse State Audit

데이터가 존재하지만 의미 있는 분석에 부족할 경우 별도의 상태가 필요한지 검토한다.

예:

> 아직 방문 고객이 적어 고객 특성을 판단하기 어려워요.

---

# 60. Error State Audit

API 오류 시:

```
0원
0건
```

으로 fallback하면 안 된다.

데이터 없음과 API 실패를 구분한다.

---

# 61. 실제 Interaction Audit

페이지의 모든 주요 interaction을 실제 브라우저에서 조작한다.

예:

- date picker
- previous period compare
- tabs
- service selection
- demographic selection
- chart hover
- tooltip
- detail link
- expand/collapse
- retry

---

# 62. Interaction 결과 형식

각 interaction:

```
Action:
Expected:
Actual:
Result: PASS / FAIL
Evidence:
```

형식으로 기록한다.

---

# 63. Console Hard Audit

브라우저 console에서 다음을 확인한다.

- runtime exception
- unhandled rejection
- React warnings
- hydration
- invalid props
- chart errors
- failed resources

중요 error가 있는데 UI가 보인다는 이유로 PASS하지 않는다.

---

# 64. Network Hard Audit

분석 화면 interaction 동안:

- API endpoint
- request frequency
- duplicate request
- status
- query parameter
- date range
- response shape

를 확인한다.

---

# 65. 날짜 Filter → 실제 API 검증

예:

UI에서:

```
8월 1일 ~ 8월 12일
```

선택했을 때 실제 API request가 정확한 날짜를 보내는지 확인한다.

Timezone offset 문제도 조사한다.

---

# 66. Frontend Transformation Audit

API data가 Frontend에서 잘못 가공되는지 확인한다.

예:

```
sales / 1000
Math.round()
parseInt()
percentage
```

등.

숫자 format과 actual calculation을 구분한다.

---

# 67. Currency Formatting

원화 표시가 일관적인지 확인한다.

예:

```
₩5,240,000
5,240,000원
524만원
```

화면 곳곳에서 무작위 방식으로 섞이지 않는지 확인한다.

---

# 68. Precision Audit

일반 원장이:

```
12.483729%
```

같은 값을 볼 필요가 있는지 평가한다.

과도한 precision을 줄이는 것을 제안할 수 있다.

---

# 69. Salon-specific Reference Research

이번 Hard Audit에서도 외부 reference를 최신 검색으로 조사한다.

하지만 UI를 복제하기 위한 것이 아니다.

현재 제품의 누락과 과잉을 판단하기 위한 benchmark로 사용한다.

---

# 70. Salon Reference 후보

공식 자료가 충분한 제품에서 3~5개를 선택한다.

후보:

- Fresha
- Phorest
- Vagaro
- Boulevard
- Square Appointments
- GlossGenius
- Mindbody

실제 현재 공식 정보를 검색한 뒤 선택한다.

---

# 71. Salon References에서 Audit할 것

다음을 비교한다.

- owner dashboard
- sales summary
- service performance
- client retention
- new / returning client
- appointment performance
- cancellation / no-show
- staff
- average spend
- date comparison

---

# 72. Toss Place Reference

한국 개인사업자용 쉬운 언어 benchmark.

특히:

- 비교 문구
- 매출 표현
- 오늘/지난 기간
- 짧은 설명

을 참고한다.

---

# 73. Shopify Analytics Reference

다음 원칙만 benchmark한다.

> Overview → Detail

첫 화면에서 모든 분석을 보여주지 않는 구조.

---

# 74. Naver SmartStore Reference

미용실 도메인 reference가 아니라 **Demographic 처리 benchmark**로 사용한다.

특히:

- gender
- age
- unknown
- sample 부족
- 국내 terminology

를 조사한다.

---

# 75. ONS Data Visualization Guidance

Hard Audit에서 매우 중요하다.

특히:

- chart message
- written context
- first frame
- annotation
- accessibility
- dashboard가 해석 부담을 사용자에게 넘기는 문제

를 benchmark한다.

---

# 76. Power BI Design Guidance

다음 원칙을 benchmark한다.

- audience
- core metrics
- chart simplicity
- hierarchy
- avoid unnecessary visualization
- scale
- precision

Power BI UI complexity는 benchmark하지 않는다.

---

# 77. Reference Audit 결과

Reference마다:

```
Pattern
Current Product
Gap
Severity
Recommendation
```

형식으로 정리한다.

단순:

> Fresha가 이것을 제공하니 우리도 넣자

라고 하지 않는다.

현재 SQL이 지원하는지까지 확인한다.

---

# 78. UX / UI / Data를 별도 점수로 평가한다

각 영역을 100점으로 평가한다.

최종 점수만 던지지 말고 근거를 명확히 한다.

---

# 79. UX Score — 100점

예시 평가 영역:

### 20점

핵심 매장 상태 이해

### 15점

기간 비교 이해

### 15점

시술 성과 이해

### 10점

고객 분석 이해

### 10점

시간 분석

### 10점

정보 hierarchy

### 10점

interaction

### 10점

mobile/accessibility

점수 항목은 실제 audit 결과에 맞게 조정 가능하다.

---

# 80. UI Score — 100점

평가:

- visual hierarchy
- typography
- spacing
- density
- chart readability
- consistency
- responsive
- accessibility
- visual noise
- professionalism

예쁜지만 평가하지 않는다.

---

# 81. Data Analysis Score — 100점

가장 엄격하게 평가한다.

- Metric 정의 정확성
- 날짜 기준
- aggregation
- SQL correctness
- status filtering
- refund
- duplicate joins
- previous period
- demographic denominator
- sample size
- causal claim
- insight correctness

---

# 82. Business Usefulness Score — 100점

다음을 평가한다.

- 원장이 지금 장사가 잘되는지 알 수 있는가?
- 어떤 시술이 중요한지 알 수 있는가?
- 고객 흐름을 이해할 수 있는가?
- 시간 패턴을 이해할 수 있는가?
- 정보가 실제 운영에 쓸 만한가?
- 의미 없는 vanity metric이 많은가?

---

# 83. 최종 Overall Score

네 영역을 모두 보여준다.

예:

```
UX                71 / 100
UI                82 / 100
Data Analysis     58 / 100
Business Fit      64 / 100
```

전체 숫자 하나로 숨기지 않는다.

---

# 84. Hard Audit Severity

## P0 — Critical

사용자가 잘못된 사업 판단을 할 수 있는 데이터 오류.

예:

- 매출 중복 계산
- 예약 금액을 실제 매출로 표시
- 환불 무시
- 다른 기간 비교
- 잘못된 고객 count

---

## P1 — Major

핵심 사용성이 크게 깨진 문제.

예:

- 중요한 Metric 의미 불명확
- 핵심 Chart 이해 불가
- 기간 filter가 실제 API에 반영되지 않음
- 핵심 mobile 사용 불가

---

## P2 — Moderate

상당한 UX/UI/Data quality 문제.

예:

- misleading microcopy
- 불필요한 chart
- demographic unknown 누락
- empty state 문제
- accessibility

---

## P3 — Minor

visual polish 또는 작은 개선.

---

# 85. 발견 사항은 반드시 Evidence와 함께

각 Issue:

```
ID:
Severity:
Category:
Screen:
Problem:
Evidence:
User Impact:
Data/Code Root:
Reference:
Recommendation:
Confidence:
```

형식으로 기록한다.

---

# 86. 추측과 사실을 구분한다

각 finding을:

```
OBSERVED
INFERRED
NOT VERIFIED
```

중 하나로 구분한다.

예:

```
OBSERVED
SQL에서 status 조건 없이 payment를 합산함.
```

```
INFERRED
취소된 결제까지 포함될 가능성이 있음.
```

확인 전 둘을 같은 것으로 쓰지 않는다.

---

# 87. UI 문제와 Data 문제를 분리한다

예:

```
UI Problem
“수익”이라는 label이 사용자에게 이익으로 오해될 수 있음.
```

```
Data Problem
실제 값은 payment amount sum.
```

둘을 연결해서 설명한다.

---

# 88. 불필요한 기능 추가를 추천하지 않는다

Hard Audit은 기능 아이디어 brainstorming이 아니다.

각 추천은 다음 중 하나여야 한다.

- 제거
- 단순화
- 이름 수정
- 위치 변경
- 계산 수정
- 비교 수정
- 설명 추가
- 접근성 수정
- 상태 처리
- 필요한 경우에만 새 분석 추가

---

# 89. Recommendation Priority

각 recommendation에:

```
Impact
Effort
Priority
```

를 부여한다.

예:

```
High Impact / Low Effort
```

가 최우선.

---

# 90. Quick Wins

별도 섹션으로:

> 1~2일 내 개선 가능한 고효율 문제

를 정리한다.

예:

- 잘못된 label
- comparison 설명
- chart title
- unknown percentage
- KPI 우선순위

---

# 91. Structural Improvements

더 큰 개선은 별도로 분리한다.

예:

- backend aggregation 수정
- 재방문 정의 재설계
- analytics endpoint 수정
- information architecture 변경

---

# 92. Do Not Redesign Yet

Hard Audit 결과가 나오기 전에:

- 새 dashboard 전체 구현
- component 대량 교체
- chart library 교체
- 새로운 analytics API 구현

을 하지 않는다.

먼저 audit report를 완성한다.

---

# 93. 최종 Audit Report 저장

추천 경로:

```
docs/audit/salon-analytics-hard-audit.md
```

---

# 94. Audit Report 구조

반드시 다음 구조를 사용한다.

```
# Salon Analytics Hard Audit

## Executive Summary

## Overall Scores

## Target User

## System & Data Understanding

## Metric Dictionary

## Critical Findings

## UX Audit

## UI Audit

## Data Analysis Audit

## Business Usefulness Audit

## Mobile Audit

## Accessibility Audit

## Reference Benchmark

## 10-second Test

## 30-second Test

## Quick Wins

## Structural Improvements

## Remaining Unknowns

## Final Verdict
```

---

# 95. Executive Summary

5~10문장 정도로 핵심 상황을 설명한다.

예:

- UI는 깔끔하지만 핵심 비교가 약함.
- 시술 분석은 존재하지만 원장이 직접 그래프를 해석해야 함.
- 매출 계산은 정확하지만 환불 처리 확인 필요.
- 고객 성별 통계는 unknown 비중 때문에 과대해석 가능.
- 현재 전체 경험은 “통계 표시” 수준이고 “경영 이해” 수준에는 미달.

실제 audit 결과로 작성한다.

---

# 96. Critical Findings는 가장 위에

P0 / P1부터 정리한다.

사용자는 보고서 전체를 읽지 않아도 가장 중요한 문제가 무엇인지 알아야 한다.

---

# 97. Before / Evidence Screenshot

Product Design Audit으로 확보한 screenshot을 적절히 사용한다.

각 주요 UX finding에 현재 화면의 근거를 연결한다.

---

# 98. Hard Audit에서 좋은 평가도 기록한다

모든 것을 비판하기만 하지 않는다.

현재 잘된 부분:

- 유지해야 함
- 변경하지 않아야 함

을 명확히 기록한다.

예:

```
KEEP
기간 selector는 단순하고 이해하기 쉬움.
```

---

# 99. “원장이 보기 좋은 정도”의 의미

이번 Audit에서는 “좋다”를 다음처럼 정의한다.

좋은 화면은:

- 전문 분석 용어를 몰라도 된다.
- 첫 화면에서 장사 상태를 이해한다.
- 숫자와 비교가 함께 있다.
- Chart를 읽지 않아도 중요 내용을 알 수 있다.
- 세부 정보가 필요하면 내려갈 수 있다.
- 잘못된 확신을 주지 않는다.
- 업무 중 휴대폰으로 짧게 볼 수 있다.
- 매일 또는 주기적으로 다시 볼 가치가 있다.

---

# 100. 반대로 너무 단순한 것도 실패다

일반 사용자를 대상으로 한다고:

```
매출 500만원
```

하나만 보여주는 것은 좋은 UX가 아니다.

원장은 최소한:

```
얼마
+
이전보다 어떤지
+
무엇이 변했는지
```

를 이해할 수 있어야 한다.

---

# 101. 너무 전문적인 것도 실패다

다음 같은 BI식 UI가 기본 화면에 있으면 검토한다.

- Dimension selector
- Metric selector
- Advanced segmentation
- Pivot
- Multiple Y-axis
- 자유로운 chart builder
- SQL-like filter

원장 대상 overview에는 과할 수 있다.

---

# 102. Hard Audit의 핵심 질문

각 Section마다 마지막에 이 질문을 한다.

> 이 정보가 원장에게 어떤 의미가 있는가?

답하지 못한다면:

- 정보 자체가 불필요한지
- 표현이 잘못된 것인지
- context가 부족한 것인지

판단한다.

---

# 103. Final Verification

보고서 완료 전에:

`verification-before-completion`

또는 동등한 verification workflow를 사용한다.

최소 확인:

- 실제 SQL 확인
- 실제 frontend 확인
- 실제 API 확인
- 실제 browser audit
- reference research
- score evidence
- 주요 finding evidence

---

# 104. 검증하지 못한 것은 숨기지 않는다

예:

```
NOT VERIFIED
실제 production database data distribution은 접근 권한이 없어 확인하지 못함.
```

같이 명시한다.

---

# 105. 최종 Verdict

다음 중 하나를 사용한다.

## PASS

현재 상태가 일반 미용실 원장에게 충분히 이해 가능하며 큰 데이터 문제 없음.

## PASS WITH MAJOR IMPROVEMENTS

기본 사용은 가능하지만 중요한 UX/Data 문제가 존재.

## FAIL

핵심 정보 이해 또는 데이터 정확성에 중대한 문제가 있어 현재 분석 화면을 그대로 신뢰하기 어려움.

## BLOCKED

감사에 필요한 실행 환경 / DB / Browser / API 접근이 부족해 판단 불가능.

---

# 106. 마지막에 반드시 답할 질문

다음 질문에 명확히 답한다.

> **데이터 분석을 잘 모르는 미용실 원장이 이 페이지를 처음 열었을 때, 별도의 분석 지식 없이 현재 매장 상황을 정확하게 이해할 수 있는가?**

그리고:

> **현재 제공되는 분석 결과는 실제 SQL과 Backend 데이터를 기준으로 신뢰할 수 있는가?**

그리고:

> **현재 페이지에 있는 정보 중 실제 미용실 운영에 의미 없는 정보, 부족한 정보, 오해를 유발하는 정보는 무엇인가?**

---

# 107. 첫 실행 순서

이 문서를 읽은 Codex는 바로 UI 수정부터 하지 않는다.

다음 순서로 시작한다.

```
1. Project Root 확인
2. .codegraph 조사
3. SQL 탐색
4. Analytics 관련 frontend/backend 추적
5. Metric Dictionary 초안
6. Skills 확인
7. Product Design audit 준비
8. 앱 실행
9. Desktop audit
10. Mobile audit
11. Network / Console
12. Data correctness audit
13. Salon reference research
14. Hard Audit report
15. 사용자에게 결과 보고
```

---

# 108. 첫 사용자 보고 형식

본격적인 audit 시작 전 간단하게 다음만 보고한다.

```
# Audit Preflight

## Project
- Root:
- Analytics route:
- Frontend framework:

## Data
- Relevant SQL:
- Key tables:
- Analytics endpoints:
- Initial metric candidates:

## Skills
- Product Design audit:
- Browser:
- systematic-debugging:
- verification:

## Audit Scope
- UX:
- UI:
- Data:
- Business Fit:
- Mobile:
- Accessibility:

## Blockers
- ...

## Next
실제 브라우저와 SQL을 기준으로 Hard Audit 시작
```

---

# 109. 마지막 원칙

이번 작업에서 가장 중요한 것은:

> **예쁜가?**

가 아니다.

다음 세 가지다.

> **정확한가?**

> **이해되는가?**

> **미용실 원장에게 실제로 의미가 있는가?**

모든 UX, UI, Chart, Metric, Insight를 이 세 질문으로 평가한다.

그리고:

> **UI가 세련되어 보여도 데이터 의미가 잘못되어 있으면 실패다.**

> **데이터가 정확해도 원장이 이해할 수 없으면 실패다.**

> **이해하기 쉬워도 운영에 아무 의미가 없는 정보라면 실패다.**

최종 목표는:

> **정확한 데이터를, 미용실 원장이 이해할 수 있는 수준으로, 실제 운영에 도움이 되도록 전달하는 분석 페이지인지 증명하는 것**

이다.