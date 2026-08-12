# 미용실 매출 분석 — Reference 조사

작성 2026-08-12 · 조사 범위: 해외 미용실 관리 제품 8종 + 한국 제품 11종 + 대시보드 설계 권위 자료

**규칙**: 실제 페이지에서 확인한 것만 적는다. 확인 못 한 것은 `확인 실패` 로 남긴다.
기억으로 UI를 만들지 않기 위한 문서이므로, 근거 없는 문장은 오히려 해롭다.
**(D)** = 제품 공식 문서 · **(M)** = 마케팅 페이지.

---

# 요약 — 가장 중요한 세 가지

1. **"재방문율"은 제품마다 서로 호환되지 않는 네 가지 뜻으로 쓰인다.** 두 곳은 코호트(1기 집단이 2기에 돌아왔나),
   두 곳은 방문자 구성비(이번 달 온 사람 중 전에도 온 사람 비율). 같은 데이터에서 전혀 다른 숫자가 나온다.
   **Zenoti 는 자사 리포트끼리도 비교하지 말라고 스스로 경고한다** — "the definition of retention differs between reports".
2. **진행 중인 기간 문제를 문서로 다루는 곳은 Boulevard 하나뿐**이고, 그마저 리텐션에만 해당한다.
   나머지는 전부 "This Month"를 지난달 **전체**와 말없이 견준다. Phorest 는 비교 규칙을 문서화해 놓고도
   "This Month" 만은 미완결 달을 완결 달과 견준다.
3. **전부 숫자 격자로 시작한다. 문장으로 시작하는 제품은 없다** — 한국 핀테크 계층(캐시노트)과
   헤어짱의 AI 전환만 예외이고, 그들은 대시보드가 아니라 **카카오톡 푸시**로 문장을 보낸다.

---

# Part 0 — 해외 제품 8종

## Fresha

**첫 화면 (D)**: `Business performance summary` → `Team summary` → `Clients summary` → `Fresha Marketplace summary`.
개별 타일 이름은 확인 실패.

**매출 라벨 (D) — 같은 제품이 리포트 두 곳에서 net 을 다르게 정의한다:**
- Sales summary: `Gross sales` = 세금 포함 총액 · `Net sales` = "Total net sales value processed" (순환 정의)
- Finance summary: `Gross sales` = 공제 전 · **`Net sales` = "Gross sales minus refunds, discounts, and taxes"**

**재방문 — 코호트가 아니라 구성비 (D). 우리가 만든 것과 정확히 같은 계산이다:**
- `New clients` = "첫 예약이 이 기간 안에 있는 고객"
- `Returning clients` = "첫 예약이 이 기간 **이전**인 고객"
- `% Returning clients` = 전체 고객 중 returning 의 비율

→ 이것은 리텐션이 아니라 **구성 지표**다. 신규가 0이면 100% 가 나온다.
**우리 "재방문 고객 비중" 이 이 정의와 일치한다** — 업계 최대 제품이 같은 계산을 쓰되,
Fresha 는 `% Returning clients` 라 부르고 우리는 "비중"이라 부른다. 이름이 더 정직한 쪽은 우리다.

**시간 패턴 (D) — 조사 대상 중 최고**: Sales by time period 의 `Group by` 에
"Hour of the day", "Day of the week" 가 1급 옵션으로 있다. 문서가 밝힌 용도:
"identifying peak hours to optimize shift patterns". → **우리 요일·시간 카드가 이 관행과 정확히 같다.**

**진행 중 기간**: 확인 실패. 직전 기간 비교 기능 자체가 문서에 없다.

## Phorest

**첫 화면 (M)**: `Total Sales` `Daily Sales` `Sales Breakdown` `Average Ticket` `Retail to Service %` /
`Client Visits` `Value of Future Appointments` `Busiest Days` `Rebooking Rate` `Returning Client Percentage`.

**숫자에 맥락을 붙이는 유일한 제품 (D/M)**: "with every number, there is context" — 전주 대비 증감률과
**툴팁으로 계산법을 설명**한다. "each report has a tooltip icon giving a breakdown of how the report is calculated".

→ **우리 화면의 판단 (코드를 고쳤다)**: 고객 카드의 각 줄에 계산법을 한 줄씩 달았다.
업계에서 같은 말이 네 뜻으로 쓰이므로, 이름만 적고 넘어가면 원장이 자기가 알던 뜻으로 읽는다.

**재방문 — 진짜 코호트 (D)**: 날짜 범위를 **두 개** 받는다. 1범위에서 방문한 고객이 2범위에 돌아왔는지 센다.
`Salon Retention` = 돌아온 수 ÷ 1범위 고객 수.

**그런데 같은 제품이 다른 리포트에서 구성비도 쓴다 (D)**: Performance Stats 의 `Clients Visiting More Than Once`
는 같은 창 안에서 2회 이상 온 비율 — 코호트가 아니다. **한 제품 안에 두 정의가 공존한다.**

**Rebooking rate (D) — 가장 정밀하게 규정된 지표**: "방문 **당일 안에**" 다음 예약이 잡혀야 한다.
담당자가 달라도 인정, 다른 지점도 인정, **하루라도 지나면 불인정**, 나중에 취소되면 제외, 워크인은 제외.

**진행 중 기간 (D)**: 비교 규칙은 문서화돼 있다 — "compared to the equivalent date range immediately prior".
Custom 범위는 일수를 맞추지만 **"This Month" 는 맞추지 않는다**. 미완결 달 ↔ 완결 달, 경고 없음.
Year on Year 리포트만 "the same period in the previous year" 로 이를 피한다.

## Boulevard

**진행 중 기간에 대한 유일한 명시적 지침 (D)** — 조사 전체에서 가장 값진 문단:
리텐션 리포트는 "고객이 돌아올 시간이 있을 만큼 충분히 과거로" 범위를 잡아야 한다.
오늘이 1월 1일일 때: 90일 창 · 월간 → 9월 1~30일. 180일 창 · 월간 → 6월 1~30일.

**매출 라벨 (D) — 조사 중 가장 정밀**:
- `Gross Sales` = "Total sales before discounts, offers, or refunds applied"
- `Net Sales` = "All sales after refunds, discounts, and voucher adjustments", **"Sales do not include Sales Tax."**
- **기본값 경고**: "reports default to include gross sales metrics, and it's recommended to add additional
  columns for net sales" — 기본으로 나오는 숫자가 더 좋아 보이는 쪽이다.

**재방문 — 코호트, 창을 명시 (D)**: `X-Day Location Revisit Count`, X ∈ {30, 60, 90, 120, 150, 180}.
`Location Revisit %` = Revisit Count ÷ Client Count.

## Zenoti

**재방문 — 60일 롤링 코호트, 계산 과정을 공개 (D)**: 9/15~9/30 사이 `closed` 예약 고객 → 이후 60일
(10/1~11/29) 안에 또 `closed` 예약이 있으면 "retained". 창은 설정 가능.

**조사 전체에서 가장 중요한 한 문장 (D)**: 이 리포트 값을 **다른 리텐션 리포트와 비교하지 말라** —
"as the definition of retention differs between reports".

**시술 카테고리별 리텐션 (D)** — 이걸 계산하는 유일한 제품: "guests may have a higher probability of
returning after facials or massages and a lower probability after salon services".

**리텐션 히트맵 (D)**: 코호트 히트맵을 제공하나 **분자/분모 공식은 공개하지 않는다**.

## Square · Vagaro · Mindbody · Booksy (요약)

- **Square (D)**: 표준 문서와 레스토랑 문서가 **서로 모순된다** — 표준은 `gross` = 할인 전,
  레스토랑은 **`gross` = `net` + 세금**. 같은 회사 문서에서 gross/net 관계가 뒤집힌다. 리텐션 지표 없음.
- **Vagaro (D)**: `Sales Break Down` 이 **예약됐지만 아직 결제 안 된 매출을 "projected" 로 보여주고,
  결제되면 actual 로 옮긴다** — 진행 중 기간 문제에 대한 유일한 구조적 대응이다(문서는 그렇게 설명하지 않지만).
  재방문은 코호트도 구성비도 아닌 **수동 태그 2×2 행렬**(NR/NNR/RR/RNR)이고 "**소급 적용되지 않는다**".
- **Mindbody (D)**: `Earned Revenue` — 선불 이용권 중 **실제 사용된 몫만** 매출로 인식하는 이연 매출 개념.
  다른 제품과 근본적으로 다른 매출관. 리텐션 공식은 확인 실패.
- **Booksy (M)**: 리포트 개수조차 페이지마다 다르다(50+/20+/16). 공식 확인 실패.

---

# Part 1 — 한국 미용실 관리 프로그램


## 1.1 실제로 쓰는 라벨

| 제품 | 확인된 라벨 | 없는 것 |
|---|---|---|
| **헤어짱** (글리티, 26,000+ 샵) | `매출분석` `정보분석` `고객동향 분석` `매출현황` `영업분석현황` `매출결산/분석` `접객통계` `방문현황트래킹` `정산` | 총매출 · 실매출 · 순매출 · 객단가 · 재방문율 · 신규고객 |
| 헤어짱 간편통계 (언론 보도) | `매출 구분별 통계`, `결제수단별/연령대별/성별/**시술객단가**별`, `월별 매출현황`, `요일별·시간대별·시술메뉴별` | — |
| **공비서 원장님** | 유일하게 둘을 함께 내건다: "**객단가와 재방문율이 매일 자동으로 정리됩니다**". `매출 분석 리포트` `시술별 매출` `신규 고객` `최근 방문일` | 총매출 · 순매출 · 정산 |
| **뷰티인프라** | `매출 관리/분석` `자동 정산 시스템` `매출 현황/명세서` `디자이너별 매출현황` `일 마감` | 객단가 · 신규고객 (재방문율은 마케팅 문구에만) |
| **뷰카 (VUKA)** | `매출 분석`, "이번 달과 다른 달의 매출을 비교하세요", 유료: "예약율, 취소율, **재방율**" | 객단가 · 재방문율 (축약형 재방율을 쓴다) |
| **헤어인포** | "**신규고객, 방문주기, 매출**을 일별/월별/디자이너별/서비스별로 분석" | 객단가 · 정산 |
| **카카오 예약하기 파트너센터** | **`실매출` 을 쓰는 유일한 출처**: "실매출, 예약완료, 예약취소, 이용완료". `기간별 판매현황` `첫예약 고객 수` `재예약 고객 수` `재예약 고객 비율` | 신규/재방문 이라는 말 자체 |
| **토스플레이스** | `매출 리포트` `매출현황` `매출달력` `매출 등락률`. 순매출 개념을 라벨 없이 풀어 쓴다: "**할인 금액을 제외한 실제 판매 금액**" | 부가세 · 객단가 · 재방문율 |
| 토스 고객 등급 | `첫 적립` `예비 단골` `단골` `뜸한 고객` `부활 고객` — 비율이 아니라 **집단 이름** | — |
| **페이히어** (POS) | **공식을 공개한 유일한 한국 제품**: `총 매출 = 실 매출 + 할인 + 포인트 사용 금액`. `카테고리 별 분석` `판매 순위` `결제수단 별 매출` | 객단가 · 재방문율 · 신규고객 (전부 없음) |
| **캐시노트** | **문장/푸시 원형 — 카카오 알림톡으로 보낸다.** `이 달의 누적 매출` `오늘 예상 매출` `어제 시간대별 매출 분석` `지난 주 평균 객단가` `재방문 고객 분석` `목표 달성률` `상권 비교 분석` | 계산식 (없음) |
| **도도포인트** | `신규` `단골` `생일` — 비율이 아니라 자동 분류 **집단** | 객단가 · 재방문율 |
| **뷰티인프라** (재방문) | `재방률 분석`: "방문율, **재방율**, 순방문자 증가율" 3종을 나란히 두고 **정의는 하나도 없다** | 정의 전부 |

### 결론 1 — 업계 표준 용어가 없다

같은 개념이 제품마다 다르게 불린다.

```
재방문율 (공비서) / 재방율 (뷰카) / 재예약 고객 비율 (카카오) / 이름 붙인 집단 (토스)
```

`총매출` `순매출` 은 **어느 미용실 제품에도 없다**. `실매출` 은 카카오에만 있다.

→ **우리 화면의 판단**: `docs/redesign/C-revenue-definition.md` 가 정한 `총 매출` 을 그대로 쓴다.
업계에 따를 표준이 없으므로, 우리 안에서 한 이름을 정하고 어기지 않는 편이 낫다.
다만 화면에 **정의를 적는다** — 다른 제품을 쓰던 원장이 같은 말을 다른 뜻으로 알고 있을 수 있다.

## 1.2 공개된 계산식

**객단가** — 미용실 제품 중 자기 정의를 공개한 곳은 없다 (확인 실패). 일반 출처:

- "고객 1인(1회 방문)이 평균적으로 지불한 금액 (AOV)". **총 매출액 ÷ 총 방문 고객 수**. 기준은 할인·포인트 적용 **후** 실제 결제액.
- 토스페이먼츠: "**객단가 = 매출 ÷ 구매 고객 수**"
- 미용업 항등식: **고객수 × 객단가 × 방문 횟수 = 매출**

→ **우리 화면의 판단 (코드를 고쳤다)**: 나누는 값을 결제 건수 → **방문 수**로 바꿨다.
항등식이 방문 횟수를 따로 두고 있고, 같은 손님이 같은 날 두 번 결제해도 쓰고 간 것은 한 번 몫이다.
실측: 2026-07 결제 89건 · 방문 88회 (같은 날 재결제 1건).

**재방문율** — 미용실 제품 중 계산식을 공개한 곳은 없다 (확인 실패). 공비서는 이름만 내걸고 정의하지 않는다.

- 카카오 (계산식을 공개한 유일한 예약 플랫폼): "**재예약 고객 비율 = 재예약 고객 수 / 누적 총 예약 고객 수 × 100%**"
  — 주의: 같은 문서 안에서 첫예약/재예약 정의가 서로 어긋난다.
- 일반 재구매율: (2회 이상 구매 고객 수) ÷ (전체 구매 고객 수) × 100
- 토스는 비율을 아예 버리고 방문 횟수 기준 집단으로 바꿨다 — 단골 = "3개월간 7번 이상", 뜸한 고객 = "45일 동안 오지 않은".

→ **우리 화면의 판단**: 우리가 세는 것은 카카오식 **비율**이지 코호트 추적이 아니다.
그래서 "재방문 고객 비중" 으로 쓰고 "재방문율" 이라는 말을 쓰지 않는다. 이 판단은 조사로 오히려 강해졌다 —
업계에서 그 말이 최소 네 가지 다른 뜻으로 쓰이고 있다.

## 1.3 문장이 먼저인가, 숫자 격자가 먼저인가

**마케팅 페이지는 전부 문장이 먼저다.** 헤어짱 "예약부터 정산까지, 하루 운영이 어떻게 달라지는지
직접 확인해보세요" 뒤에 `26,000+ / 120,000+`. 공비서 "공비서 원장님 하나면, 뷰티샵 관리 걱정 제로(0)".

**그러나 제품 화면 자체는 조밀한 다중 패널 상황판으로 묘사된다.**
헤어짱 "예약/대기/접수현황, 매출현황, 고객동향, 매장현황 확인을 한번에".
카카오 "선그래프로 실매출이, 막대그래프로 이용완료·이용예정 지표가 함께 표시".

**문장으로 시작하는 원장용 대시보드는 조사 범위에서 하나도 찾지 못했다.**
스크린샷 안의 실제 KPI 문구도 확인 실패 — 제품 페이지가 이미지 파일명만 노출하고 alt 텍스트가 없다.

→ **우리 화면의 판단**: 브리핑 한 줄은 업계 관행이 **아니다**. 차별점이자 위험이다.
문장이 틀리면 곧바로 거짓말이 되므로, 문장 생성 규칙을 전부 테스트로 고정했다
(`lib/salon-briefing.test.ts`). 문장 아래에 숫자 격자를 그대로 두어, 관행에 익숙한 원장이
평소 보던 방식으로도 읽을 수 있게 한다.

## 1.4 부가세

**어느 한국 미용실 제품도 화면의 매출이 VAT 포함인지 밝히지 않는다** (헤어짱·공비서·뷰티인프라·
뷰카·헤어인포·카카오·토스 전부 확인, 언급 없음).

세법의 기본값은 POS 매출이 **부가세 포함**임을 함의한다:
"세법상으로는 …분명하지 아니한 경우에는 일단 부가가치세를 포함한 금액을 수취한 것으로 보므로".
소비자가 10,000원 → 사업자의 공급가액 9,091원.

→ **우리 화면의 판단**: 우리 원장에는 행마다 `details.vatMode` 가 있어 포함/별도가 섞인다.
그래서 VAT 를 매출의 분해로 쓰지 않고 **정산 표 한 줄**로만 둔다.
업계가 이 질문에 답하지 않고 있다는 사실 자체가, 우리가 정산 표를 남겨야 하는 이유다.

## 1.5 재방문율 벤치마크

**한국 미용실 재방문율의 공개 수치는 존재하지 않는다 (확인 실패).**
학술 검색 결과는 재방문 **의도**(설문)를 재는 것이지 실제 비율이 아니다.

가장 가까운 실데이터 — 헤어짱/글리티 자사 사용자 분석 (재방문율은 **없다**):

| | 상위 100 | 중위 100 |
|---|---|---|
| 객단가 | 55,713원 | 38,499원 (1.45×) |
| 전체 매출 | 5,697만 원 | 629만 원 (9.1×) |
| 마케팅 기능 활용 | 85.9% | 47% |
| 선불권/회원권 매출 비중 | 9.8% | 7.8% |

"신규 재방문율 50%+, 기존 90%+" 라는 목표치가 검색되지만, **출처의 사례가 도쿄 상권(아오야마·하라주쿠)이다.
일본 실무 경험칙의 번역이지 한국 통계가 아니다 — 한국 수치로 인용하면 안 된다.**

→ **우리 화면의 판단**: 벤치마크 선을 긋지 않는다. "94%는 좋은 편입니다" 같은 문장을 쓸 근거가 없다.
비교 대상은 남의 가게가 아니라 **이 가게의 지난 기간**이다.

**확인 실패 (제품 페이지 자체를 못 찾음)**: 마이샵, 살롱드, 뷰티북, 예약하나, 하이오더,
네이버 예약 파트너센터 공식 통계 문서, 배민사장님광장 리포트 필드명, KB/신한 사장님 매출 리포트.

---

# Part 2 — 대시보드 설계 권위 자료

## 2.1 진행 중인 기간을 지난 기간과 견주기

**Amplitude 가 가장 강한 1차 출처이고, 점선 관행을 실제로 구현하고 있다.**

- 기본값은 미완결 구간 포함: "your queries return data from the specified timeframe,
  **plus the latest still-incomplete interval**"
- **"The current date no longer appears framed in a dotted line"** ← 진행 중인 구간을 **기본으로 점선 테두리** 처리
- 표에서는 별표: "incomplete cells have an asterisk"
- 이걸 안 하면 생기는 일: 리텐션 곡선이 "can curve up and appear to increase over time"
- 비교 창을 명시하라: "**Each preset displays the calculated date range so you can verify the comparison window.**"

**예상 밖의 발견 — MTD 대 MTD 도 비판받는다** (Sigma Computing):

- 부분 대 전체 반대: "comparing the current, incomplete month against the previous complete month doesn't make sense"
- **그 해법도 비판**: "current month-to-date has **wild sample size fluctuations** throughout the month";
  "when MTD has just a couple of days, MTD vs Prev MTD is unreliable"
- 권고: "a fixed 30-day window gives us a more fair comparison";
  "**unless you have a strong reason to do otherwise, your safest baseline comparison is the same period last year**"

→ **우리 화면의 판단 (코드를 고쳤다)**:
1. 같은 날짜까지 잘라 견주는 방식은 유지한다. 1인 샵에서 "지난달 같은 시점보다 나은가"가 원장의 실제 질문이고,
   Sigma 가 지적한 표본 흔들림은 월초 며칠에 국한된다.
2. **잘랐다는 사실을 라벨과 문장에 적는다** — Amplitude 의 "비교 창을 표시하라"를 그대로 따른다.
3. **진행 중인 기간에는 점선 테두리를 두른다** — Amplitude 의 문법을 빌린다.

확인 실패: Mixpanel 미완결 구간 처리, Looker Studio/GA4 부분 기간 관행, NN/g 의 이 주제.

## 2.2 분모가 0일 때의 증감률

**가장 근거가 약한 주제다. 설계 권위 자료가 이 문제를 다루지 않는다.**

- Amplitude 문서: null/zero 분모에 대해 침묵 (확인 실패)
- GitLab: 정할 수 없을 때 "n/a", 변화 없을 때 `0.0%`, **둘 다 툴팁을 붙인다** — 찾은 유일한 제품 결정
- 맨 "N/A" 의 함정: 수학적으로 옳은 표기가 사용자에게는 "데이터가 깨졌다"로 읽힌다
- "New" 로 표시하기: 어떤 권위 출처에도 없다 (확인 실패)
- 안티패턴: 분모를 0.001 로 바꿔 500000% 같은 값을 만드는 것

→ **우리 화면의 판단**: `–` 를 쓰되 **옆에 이유를 적는다** ("지난달에 견줄 기록이 없어").
브리핑 문장이 이미 그 역할을 하므로 툴팁 없이도 "깨졌다"로 읽히지 않는다.
**이 결정은 인용할 권위가 없는, 우리 판단임을 명시한다.**

## 2.3 문장 우선 vs KPI 격자

**핵심 인용 — Storytelling with Data**: 대시보드는 "**optimized for the _exploration_ of data,
not the communication of specific insights**". 발견을 전할 때는 별도 구성을 만들고, 뒷받침 데이터만
남기고, **능동형 제목**을 쓰고, 권하는 행동을 적으라.
→ KPI 격자는 *탐색* 도구이고, 탐색은 비분석가에게 잘못된 모드다.

**NN/g 가 층위 구조를 뒷받침한다** (Complex Application Design):
지침 7 "Ease transition between primary and secondary information" (정확한 숫자는 hover 툴팁으로,
"without leaving the primary screen") + 지침 8 "Make important information visually salient".
→ 문장을 두드러진 1차 층으로, 정확한 숫자를 2차로.

**NN/g 차트 인코딩**: 길이와 2D 위치가 "ideal for quantitative representation";
파이/도넛은 "most of the time" 피하고, 트리맵은 "not appropriate for simple, actionable dashboards",
게이지는 "consume a lot of precious space", 3D는 "distorts the shapes and alignment".

**"자동 인사이트/내러티브 BI" 는 설계 문헌에 없다 (확인 실패).** 벤더 마케팅과 미검증 프리프린트뿐이다.
→ **NN/g 가 브리핑 문장을 지지한다고 주장하면 안 된다.** 검증된 것은
"대시보드는 탐색용, 전달은 별도 구성" 이라는 더 좁은 명제뿐이다.

→ **우리 화면의 판단**: 문장 + 격자를 **함께** 둔 현재 구조가 두 출처 모두와 맞다.
문장이 1차 층, 숫자가 2차 층, 정산 표가 3차 층.

## 2.4 히트맵 vs 정렬된 막대

- Datawrapper: 막대는 "will often make your columns wider" → "only to your most important column(s)".
  "**A space-efficient way to visualize your data are heatmaps**". "**Use tables if precise numbers are important**"
- 히트맵의 목적은 **패턴 찾기이지 읽기가 아니다** — "readers quickly skim the table for outliers and patterns"
- **가장 강한 반대 논거는 Few 가 아니라 NN/g 다**: 사람은 색을 "as being in a particular order" 로
  지각하지 않는다 → **색으로 크기를 말하지 말고 범주에 쓰라**. 색각 이상까지 고려하면 색은 2차 단서다.
- Stephen Few 의 히트맵 비판: URL은 실재하나 PDF 파싱 실패로 **인용문 미검증**. NN/g 가 같은 말을 하고 검증되므로 그쪽을 쓴다.

**도출되는 결정 규칙**: 히트맵은 **두 차원에 걸친 밀도**를 좁은 공간에서 볼 때, 그리고 과제가
패턴/이상치 찾기일 때 정당하다. 정밀도·순위·한 차원이 과제이면 정렬 막대가 이긴다.
요일×시간(168칸)은 밀도 사례이지만 — **"몇 시가 붐비나"가 질문이면 한 차원으로 접히고, 그러면 막대가 낫다.**

→ **우리 화면의 판단 (기존 결정이 강화됨)**: 히트맵을 쓰지 않은 것은 옳았다.
표본이 한 달 88방문이라 168칸에 뿌리면 칸당 0.5건이고, 원장의 질문은 "언제 붐비나"라 한 차원으로 접힌다.
요일과 시간을 각각 정렬 막대로 나눈 현재 구조가 이 규칙과 정확히 맞는다.

## 2.5 "데이터 없음" vs "0"

**원칙**: "**Empty cells and null-values do not always equal zeros and this can be misleading.**" (Datawrapper)

**결측 구간 처리 세 기법** (Datawrapper):
1. 데이터 점에 기호를 찍는다 — 실제 관측을 가장 분명히 알린다
2. Steps 보간 — 다만 기본 Steps 는 "not useful for making visible where your data points are"
3. **점선 = 가정, 실선 = 측정**

**라이브러리 기본값 세 개가 모두 같은 편이다:**
- Highcharts `connectNulls` 기본 **`false`**. 함정: "**In stacked area chart, if `connectNulls` is set to true,
  null points are interpreted as 0.**"
- Vega-Lite 기본 `"break-paths-show-path-domains"`. `"show"` 모드가 **invalid 값을 0처럼 그리는** 모드다.
- Looker Studio 는 "Line to zero" 가 기본 — **주요 도구가 그 혼동을 기본값으로 삼고 있다** (미검증)

**빈 상태 문구** (NN/g): 백지는 "creates confusion and decreases user confidence".
권장 문구: "**There are no records to display for the selected date range.**"
안티패턴: 로딩이 끝나기 전에 "No records" 를 보여주는 것 — "particularly harmful".

→ **우리 화면의 판단 (기존 결정이 검증됨)**:
`RevenuePointState` 가 `actual|zero|missing|future|in-progress|error` 를 구분하는 설계는
세 라이브러리 기본값과 같은 편에 서 있다. 빈 기간 문구 "이 기간에는 결제 기록이 없습니다" 는
NN/g 권장 문구와 사실상 같은 문장이다.

---

# 이 조사가 실제로 바꾼 것

| # | 발견 | 코드 변경 |
|---|---|---|
| 1 | 객단가 = 총 매출 ÷ **방문** 고객 수 (한국 통용) | 분모를 결제 건수 → 방문 수로. `averageTicket(gross, mix.visits)` |
| 2 | 방문 ≠ 결제 건수 (같은 날 재결제 92건 존재) | `customerMixLedger` · `weekdayLedger` · `hourLedger` 를 (고객, 영업일) 쌍으로 집계 |
| 3 | 점선 = 미완결 (Amplitude · Datawrapper 공통 문법) | 진행 중인 기간의 브리핑 카드에 `border-dashed` + "아직 진행 중" |
| 4 | 비교 창을 명시하라 (Amplitude) | 이미 반영됨 — "지난달 같은 기간(12일까지)" |
| 5 | 재방문율은 업계에서 최소 4가지 뜻 · Zenoti 는 자사 리포트끼리 비교 금지를 경고 | "재방문 고객 비중" 유지 + **각주로 "재방문율과 다른 값"임을 명시** |
| 6 | Phorest 만이 숫자마다 계산법을 툴팁으로 붙인다 | 고객 카드 **각 줄에 계산법 한 줄씩** 추가 |
| 7 | 페이히어 공개 공식 `총 매출 = 실 매출 + 할인 + 포인트 사용` | 정산 표 아래에 **두 관계식**을 적는다 (실측 검증: 3,262,000 일치) |
| 8 | 요일×시간 히트맵은 한 차원 질문에 부적합 (NN/g) · Fresha 는 두 축을 각각 그룹핑 옵션으로 둔다 | 히트맵 배제 + 요일/시간 분리 결정이 강화됨 |
| 9 | 한국 재방문율 벤치마크는 없다 | 벤치마크 선을 긋지 않는다 |
| 10 | 자동 인사이트에는 설계 문헌 근거가 없다 | 브리핑 문장을 "검증된 관행"이라 부르지 않는다. 규칙을 테스트로 고정 |

# 채택하지 않은 것

- **Vagaro 의 projected sales** (예약된 미결제 매출을 미리 보여주고 결제되면 actual 로 옮김) —
  진행 중 기간 문제에 대한 가장 우아한 답이지만, **이 DB에 예약 데이터가 없다**. 데이터가 생기면 재고할 것.
- **Boulevard 의 X일 리텐션 창** — 코호트 추적은 이 화면의 범위를 넘고, 원장의 질문("장사 잘 되나")과 거리가 멀다.
- **Mindbody 의 이연 매출** — 선불권 잔액 원장이 없어 계산 불가 (인벤토리 C군).
- **캐시노트의 상권 비교** — 남의 가게 데이터가 없다. 비교 대상은 이 가게의 지난 기간뿐이다.

# 인용하면 안 되는 두 가지

1. **분모 0일 때의 증감률 표기에는 설계 문헌 근거가 없다.** `–` + 이유 문장은 우리 판단이다.
2. **자동/내러티브 인사이트 생성에는 설계 문헌 근거가 없다.** 검증된 것은
   "대시보드는 탐색용, 전달은 별도 구성" (Storytelling with Data) 뿐이다.
