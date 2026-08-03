# 헤어해요 웹앱 상세 UI 설계

## 1. 기준

- 대상: 미용실 고객·예약·매출 운영용 데스크톱 웹앱
- 해상도: 기준 1440×1120, 최소 1280px
- 구현: Next.js App Router + TypeScript strict + Tailwind CSS
- 원칙: `FUNCTION.md`의 기능은 제거하지 않고 메뉴·검색·drawer·modal로 재배치한다.
- Figma: [Hairhaeyo Salon Management Web App](https://www.figma.com/design/7A6bEGubfakhvXLpOPmk1o)

## 2. Figma 산출물

| 페이지 | 루트 노드 | 내용 |
|---|---:|---|
| 00 Foundations | `2:2` | 색상, 타이포그래피, 간격, radius |
| 01 Components | `4:2` | AppShell, 버튼, 필드, KPI, badge, table, drawer, modal, 예약 카드 |
| 10 Core Screens | `1:3` | 핵심 업무 화면 4종 |

핵심 화면 노드:

- 오늘 대시보드: `5:2`
- 고객 목록 + 상세 drawer: `5:114`
- 디자이너 예약 보드: `5:256`
- 시술 결제: `5:352`

## 3. 디자인 토큰

### 3.1 색상

| 역할 | 값 | Tailwind/CSS 이름 |
|---|---|---|
| 앱 배경 | `#F7F5F0` | `--background` |
| 카드/입력 | `#FFFFFF` | `--surface` |
| 기본 글자 | `#202124` | `--foreground` |
| 보조 글자 | `#687078` | `--muted` |
| 핵심 액션 | `#5C344F` | `--brand` |
| 선택 배경 | `#F0E6EB` | `--brand-soft` |
| 보조 강조 | `#B77D8F` | `--rose` |
| 성공 | `#5B806D` | `--success` |
| 주의 | `#B27A38` | `--warning` |
| 위험 | `#B84A4A` | `--danger` |
| 경계선 | `#E5E0DA` | `--border` |
| 사이드바 | `#2B2028` | `--sidebar` |

색상만으로 상태를 전달하지 않는다. 모든 상태는 badge 텍스트를 병기한다.

### 3.2 타이포그래피

- 글꼴: `Noto Sans KR`, fallback `system-ui, sans-serif`
- 페이지 제목: 28px/700
- 섹션 제목: 18–20px/700
- 본문: 13–14px/400
- label·caption: 11–12px/500
- 금액·KPI: 27–28px/700, 숫자는 `tabular-nums`

### 3.3 공간과 형태

- 사이드바 232px, 상단 바 72px
- 본문 좌우 padding 40px, 주요 grid gap 16px
- 컨트롤 높이 40–44px
- 카드 radius 14px, input/button radius 10px, badge pill
- border 1px, 기본 shadow 없음. drawer·modal에만 약한 shadow 허용

## 4. 공통 AppShell

### 구조

1. 좌측 고정 사이드바: 로고, 7개 업무 메뉴, 현재 매장/영업시간
2. 상단 바: 기준일, 도움말, 사용자/권한 메뉴
3. 본문: 페이지 제목, 설명, 대표 CTA, 업무 콘텐츠

### 메뉴

- 오늘 현황
- 고객 관리
- 예약 관리
- 매출 · 결제
- 문자 발송
- 상품 · 쿠폰
- 직원 · 설정

`FUNCTION.md`의 상세 메뉴는 각 상위 메뉴 내부의 탭 또는 설정 detail route로 배치한다. 메뉴를 추가로 중첩한 3단 sidebar는 만들지 않는다.

### 공통 동작

- `/`는 오늘 현황으로 이동한다.
- 상단 고객 검색은 `Cmd/Ctrl+K`로 열고 고객 선택 시 우측 drawer를 연다.
- destructive action은 확인 modal을 사용한다.
- 저장 성공/실패는 toast와 해당 필드 오류를 함께 표시한다.
- drawer를 열어도 목록 필터·스크롤 위치를 유지한다.

## 5. 핵심 화면 상세

### 5.1 오늘 현황 — `5:2`

구성:

- 상단 KPI 4개: 오늘 매출, 오늘 예약, 신규 고객, 확인 필요
- 좌측 2/3: 시간순 오늘 예약 목록
- 우측 상단: 디자이너별 매출·진행 건수
- 우측 하단: 미수금, 노쇼, 재고 부족, 생일 고객 알림
- 대표 CTA: 예약 등록

상호작용:

- KPI 클릭 시 해당 목록에 오늘 날짜 filter를 적용해 이동한다.
- 예약 row 클릭 시 예약 drawer를 연다.
- 상태 변경은 row quick action으로 제공하고 권한을 확인한다.
- 알림 클릭 시 원인 엔터티의 상세 drawer/page로 이동한다.

상태:

- 로딩: KPI skeleton 4개와 row skeleton 6개
- 빈 예약: 빈 상태 + 예약 등록 CTA
- 부분 실패: 실패한 카드만 retry, 나머지 데이터 유지

### 5.2 고객 관리 — `5:114`

구성:

- 검색: 이름, 연락처, 메모
- 필터: 등급, 담당자, 방문일, 상태
- 표: 고객, 연락처, 담당, 최근 방문, 누적 매출, 선불 잔액, 상태
- 우측 drawer: 기본정보, 누적 지표, 최근 시술, 메모, 선불권·쿠폰, 업무 CTA

상호작용:

- 검색은 300ms debounce 후 URL query에 반영한다.
- row 클릭은 drawer를 열고 `customerId`를 URL에 유지한다.
- drawer CTA: 예약 등록, 문자 발송, 정보 수정, 결제 등록
- 대량 선택 시 그룹/등급 변경, 문자 발송, 인쇄 action bar를 노출한다.

상태:

- 검색 결과 없음: filter 초기화와 신규 고객 등록 제공
- 연락처 중복: 저장 전에 후보 고객을 보여주고 병합/계속 등록 선택
- 민감정보: 권한이 없으면 연락처 일부 masking

### 5.3 예약 보드 — `5:256`

구성:

- 날짜 이전/다음, 오늘, 일간/주간 전환, 미배정 예약
- 시간축 09:00–18:00
- 디자이너 column 4개 이상, 수평 스크롤 허용
- 예약 카드: 고객, 시술, 상태, 시간 범위

상호작용:

- 빈 슬롯 클릭: 선택한 시간·디자이너가 채워진 예약 등록 drawer
- 카드 클릭: 상세/상태 변경 drawer
- drag 이동·resize는 1차 구현에서 제외한다. 변경은 drawer의 명시적 입력으로 처리한다.
- 중복 예약은 서버 검증 결과를 표시하고 설정에 따라 차단 또는 관리자 override한다.
- 미배정 클릭 시 오른쪽 queue를 열어 담당자를 배정한다.

접근성:

- 예약 상태는 색상과 텍스트를 함께 사용한다.
- 시간/디자이너/예약명으로 구성한 접근 가능한 이름을 카드에 제공한다.
- 키보드로 날짜 이동, 슬롯 이동, drawer 열기가 가능해야 한다.

### 5.4 시술 결제 — `5:352`

구성:

- 좌측: 고객 요약, 시술·상품 line item, 할인·쿠폰, 메모, 담당자 정산
- 우측: 결제 요약, 최종 금액, 결제수단, 카드 승인, 영수증/문자 옵션, 완료 CTA

계산 순서:

1. 시술·상품 합계
2. 쿠폰/할인/포인트/선불권 차감
3. VAT 정책 적용
4. 결제수단별 입력액 합산
5. 최종 결제액과 입력액 일치 검증
6. 저장 후 매출·직원 정산·재고·문자 이벤트 기록

상호작용:

- line item 추가/삭제 즉시 서버 계산 API로 재계산한다.
- 복합 결제는 수단별 금액 입력 합계가 최종 금액과 같을 때만 완료한다.
- 결제 완료는 idempotency key를 사용해 중복 등록을 막는다.
- 저장 성공 후 영수증 인쇄, 문자 발송 결과, 고객 잔액을 표시한다.

오류:

- 결제 승인 실패: 입력을 유지하고 실패 원인/재시도 제공
- 쿠폰 만료·잔액 부족: 해당 항목만 해제하고 재계산
- 저장 결과 불명: 자동 재시도하지 않고 거래 조회 후 상태 확정

## 6. 공통 컴포넌트와 코드 매핑

| Figma 컴포넌트 | React 컴포넌트 | 최소 props |
|---|---|---|
| `AppShell / Desktop` | `AppShell` | `activeMenu`, `children` |
| `Button / *` | `Button` | `variant`, native button props |
| `Field / *` | native input/select wrapper | `label`, 오류, native props |
| `KPI / *` | `KpiCard` | `label`, `value`, `meta`, `tone` |
| `Badge / *` | `StatusBadge` | `status` |
| `Table / Customer` | semantic `table` | columns, rows |
| `Drawer / Customer Detail` | `Drawer` | `open`, `title`, `onClose` |
| `Modal / Confirm` | `ConfirmDialog` | `open`, `title`, `onConfirm` |
| `Booking / Card` | `BookingCard` | booking DTO, click handler |

단일 화면 전용 markup은 공용 컴포넌트로 추출하지 않는다. 두 화면 이상에서 반복될 때만 추출한다.

## 7. Tailwind 구현 규칙

- 색상은 `app/globals.css`의 CSS variable로 선언하고 Tailwind arbitrary variable 또는 theme token으로 사용한다.
- class 조합 라이브러리는 추가하지 않는다. `clsx`가 이미 없다면 작은 문자열 조건으로 충분하다.
- 표는 semantic `table`, dialog는 native `<dialog>` 우선 검토, 날짜는 native input을 우선 사용한다.
- icon은 기존 의존성이 없으면 inline SVG 1세트만 사용한다.
- desktop 전용이므로 1280px 미만에서는 축소 레이아웃 대신 최소폭과 수평 스크롤을 제공한다.

권장 shell 예시:

```tsx
<div className="min-w-[1280px] bg-[var(--background)] text-[var(--foreground)]">
  <aside className="fixed inset-y-0 w-[232px] bg-[var(--sidebar)]" />
  <header className="fixed left-[232px] right-0 top-0 h-[72px] bg-white" />
  <main className="ml-[232px] pt-[72px]" />
</div>
```

## 8. Route와 상태 소유권

| 화면 | route | 주요 query |
|---|---|---|
| 오늘 현황 | `/dashboard` | `date` |
| 고객 | `/customers` | `q`, `grade`, `designer`, `customerId`, `page` |
| 예약 | `/bookings` | `date`, `view`, `designerIds`, `bookingId` |
| 결제 | `/payments/new` | `customerId`, `bookingId` |

- 서버 데이터는 Server Component에서 최초 조회한다.
- 검색/filter/drawer는 URL query가 기준 상태다.
- 입력 중 form state만 Client Component가 소유한다.
- 결제·예약 mutation은 Server Action 또는 route handler 한 방식으로 통일한다.

## 9. 후속 화면 확장 규칙

- 문자: 고객 filter + 작성 editor + 발송 검토 drawer
- 매출 분석: KPI + 기간 filter + table을 기본으로 하고 차트는 추세가 필요한 지표만 사용
- 상품·쿠폰: 고객 표 패턴을 재사용하고 재고/만료 badge만 추가
- 직원·설정: 좌측 설정 목록 + 우측 detail form의 2-column 구조
- `FUNCTION.md`의 `[추가확인]` 기능은 삭제하지 않고 구현 전 실제 데이터/팝업 동작을 검증한다.

## 10. 완료 조건

- `FUNCTION.md`의 모든 항목이 route, drawer, modal, background job 중 하나에 매핑됨
- 핵심 4화면이 1440px와 1280px에서 가로 clipping 없이 동작함
- 키보드 focus, label, 상태 텍스트, contrast 기준 충족
- 예약 중복과 결제 중복 방지 검증 통과
- 로딩·빈 상태·오류·권한 없음 상태 구현
- legacy 데이터 migration/reconciliation 결과가 화면 합계와 일치
