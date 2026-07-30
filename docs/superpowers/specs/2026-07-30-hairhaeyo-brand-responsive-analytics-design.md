# Hairhaeyo 브랜드 및 반응형 분석 설계

## 1. 결정

- 영문 제품명: `Hairhaeyo`
- 국문 제품명: `헤어해요`
- 제품 코드, 화면, 문서, 파일명, 다운로드 파일명, Figma 파일·페이지·노드에서 기존 브랜드 표기를 전부 제거한다.
- 기존 시스템은 브랜드명이나 원본 URL 없이 `기존 시스템` 또는 `레거시 시스템`으로만 지칭한다.
- 저장소 연결 URL처럼 제품 브랜드가 아닌 외부 식별자는 변경하지 않는다.

완료 조건은 저장소의 관리 대상 파일과 Figma 산출물에서 대소문자 구분 없이 기존 영문명 및 기존 국문명이 0건인 것이다.

## 2. 브랜드 적용

### 화면

- 사이드바 로고: `HAIRHAEYO`
- 보조 표기: `헤어해요 · SALON OPERATIONS`
- 브라우저 제목: `Hairhaeyo Salon Operations`
- 설명: `헤어해요 미용실 고객·예약·매출 관리 시스템`
- CSV 파일명 prefix: `hairhaeyo-`

### 코드와 문서

- package name: `hairhaeyo-web`
- 루트 규약, 기능 인벤토리, 디자인 문서와 구현 계획 제목을 새 브랜드로 변경한다.
- 브랜드가 포함된 계획·설계 파일명도 `hairhaeyo-*`로 변경하고 내부 링크를 함께 수정한다.
- 기능 인벤토리는 내용과 기능 수를 보존하되 출처를 `기존 시스템 로그인 세션`으로 표기한다.

### Figma

- 파일명: `Hairhaeyo Salon Operations Web App`
- Foundations·Components·Core Screens의 로고와 제품명 표기를 갱신한다.
- 노드 ID가 변경되면 상세 설계 문서의 참조 ID를 함께 갱신한다.

## 3. 반응형 인터랙티브 분석

대상은 모바일이 아닌 데스크톱 웹이다. 최소 폭 1280px부터 1920px 이상까지 정보 밀도와 차트 크기가 자연스럽게 확장되어야 한다. 여기서 반응형은 화면을 계속 재배치하거나 움직이는 장식이 아니라, 업무 맥락을 보존하면서 사용 가능한 폭을 효율적으로 쓰는 것을 뜻한다.

### 업무 화면과 분석 화면의 경계

- 고객 등록, 예약 등록, 시술 결제, 상품 판매, 직원·설정처럼 기록 정확도가 우선인 화면은 안정적인 고정형 업무 레이아웃을 사용한다.
- 업무 화면은 viewport에 따라 form 순서, 핵심 action 위치, table column 의미를 바꾸지 않는다.
- 업무 화면의 폭 대응은 본문 최대폭, column 폭, 여백, table scroll 영역 조정으로 제한한다.
- 자동 재배치, accordion 전환, animated card 이동, hover에 의존한 핵심 action은 업무 화면에서 사용하지 않는다.
- 반응형 chart resize, linked highlight, tooltip, legend toggle, drilldown은 매출·운영 분석 화면에만 집중한다.
- 대시보드는 업무 시작점이므로 KPI와 알림은 안정적으로 유지하고, 추세 chart가 추가되더라도 motion과 상호작용을 최소화한다.
- 시각화 상호작용이 입력·등록 flow를 가로막거나 화면 위치를 바꾸면 실패로 간주한다.

### 레이아웃

- 1280–1439px: 232px sidebar, 2-column chart grid, compact gaps
- 1440–1599px: 232px sidebar, 2-column chart grid, 기준 간격
- 1600px 이상: 분석 화면에서만 주요 추이 차트는 2/3, 보조 차트는 1/3 또는 3-column 요약 grid
- 본문은 고정 pixel 좌표를 사용하지 않고 CSS Grid의 `minmax()`와 container 폭을 사용한다.
- 화면 폭이 1280px보다 작으면 모바일 UI로 재배치하지 않고 최소폭과 수평 viewport 정책을 유지한다.
- 등록·결제 form은 1280–1920px에서 동일한 읽기 순서와 action 위치를 유지한다.

### 연동 동작

- 기간 preset, 시작일, 종료일, 담당자, 시술, 결제수단 filter를 URL query와 동기화한다.
- filter 변경은 KPI, 모든 차트, 해석 요약, 접근성 표, CSV와 인쇄 데이터를 한 번에 갱신한다.
- legend 항목 클릭으로 series를 숨기거나 다시 표시한다.
- hover/focus tooltip은 값, 구성비, 이전 기간 대비 값을 보여준다.
- chart mark 클릭 시 선택한 날짜·직원·시술·결제수단의 상세 drawer를 연다.
- drawer에서 원본 결제·환불·정정 내역으로 이동한다.
- loading, zero-data, partial-data, error, permission-limited 상태를 차트별로 표시한다.

### 데이터 규칙

- 서버가 단일 `RevenueAnalytics` 응답을 계산한다.
- KPI, 차트, 표, CSV, 인쇄는 동일 응답을 사용하며 브라우저에서 금융 합계를 재계산하지 않는다.
- 정정·환불·VAT·수수료·인센티브·경비·샵 수익은 모든 표현에서 같은 반올림 규칙을 사용한다.
- query 변경 시 이전 응답을 유지하면서 새 응답을 로드해 레이아웃 점프를 줄인다.

## 4. 접근성과 입력

- 색상만으로 series와 상태를 구분하지 않는다. label, legend, pattern 또는 명시적 텍스트를 함께 사용한다.
- 모든 chart는 제목, 요약 문장, 동일 값을 제공하는 keyboard-reachable table을 가진다.
- tooltip은 mouse hover와 keyboard focus에서 모두 열려야 한다.
- legend, chart mark, drawer trigger는 visible focus를 제공한다.
- animation은 짧고 기능적이어야 하며 `prefers-reduced-motion`에서는 제거한다.

## 5. 구현 경계

- Recharts 3.x를 단일 chart dependency로 유지한다.
- 별도 dashboard framework, canvas chart library, drag-and-drop layout은 추가하지 않는다.
- chart layout과 filter 상태를 작은 컴포넌트로 나누되 한 화면에서만 쓰는 추상화는 만들지 않는다.
- 모바일 navigation, mobile chart variant, touch-only gesture는 구현하지 않는다.

## 6. 검증

- 자동화: 브랜드 금지 문자열 0건, filter query 직렬화, 서버 집계 fixture와 KPI·chart·table·CSV 값 일치
- Playwright: 1280×800, 1440×900, 1920×1080, 125% zoom
- 상호작용: filter 변경, legend toggle, tooltip focus, chart click drawer, table 펼침, CSV download, print layout
- 시각 검수: 긴 국문 label, tooltip clipping, legend wrapping, text alignment, chart resize, horizontal overflow
- Chrome: OS font rendering과 실제 로그인 profile이 필요한 최종 검수에만 사용

## 7. 비범위

- 모바일 앱 및 모바일 전용 UI
- 사용자가 임의 배치하는 BI canvas
- 실시간 websocket streaming
- 디자인 목적의 3D·과도한 animation
