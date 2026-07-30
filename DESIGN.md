# 헤어해요 웹앱 디자인 계획

## 1. 방향

구형 테이블 기반 관리 화면을 “살롱 운영 콘솔”로 재구성한다. 화려한 랜딩페이지가 아니라, 하루 종일 쓰는 웹앱이므로 고급스러움은 장식보다 여백·타이포그래피·정보 위계·작업 속도로 만든다.

구현 기술은 **Next.js + TypeScript + Tailwind CSS**로 고정한다. Next.js App Router를 사용하고, 화면 컴포넌트와 도메인 로직에 TypeScript strict 타입을 적용한다. 디자인 토큰과 반응형 규칙은 Tailwind theme 및 CSS 변수로 관리한다.

참고 조사:

- [Godly Website](https://uiuxshowcase.com/resources/godly-website/): 강한 첫 화면, 큰 타이포, 절제된 콘텐츠 카드
- [Lapa Ninja](https://www.lapa.ninja/): 섹션형 구성, 명확한 시각적 계층, 사례 중심 레이아웃

## 2. 핵심 UX

### 2.1 데스크톱 우선 웹앱

- 기준 해상도 1440px, 최소 지원 1280px
- 모바일 앱으로 축소하지 않는다.
- 좌측 고정 사이드바 232px, 상단 글로벌 바 72px, 본문 최대폭 1440px
- 키보드 탐색과 빠른 검색 지원
- 화면 전환보다 우측 상세 패널/모달을 우선 사용해 작업 맥락 유지

### 2.2 정보 구조

1. 오늘
2. 예약
3. 고객
4. 결제·매출
5. 문자
6. 상품·쿠폰
7. 직원
8. 설정

공통 상단 검색은 어느 화면에서도 고객을 찾고 고객 상세 drawer를 열 수 있게 한다. 기존의 여러 화면에 반복된 고객 검색 폼은 하나의 글로벌 command search로 통합한다.

## 3. 대표 화면

### 3.1 오늘 대시보드

- 왼쪽: 오늘 예약 타임라인
- 가운데: 대기 고객과 예약 상태
- 오른쪽: 오늘 매출, 방문 고객, 문자 잔여량 KPI
- 하단: 공지, 자동문자 큐, 최근 활동
- 기본 액션: 고객 등록, 예약 등록, 결제 등록, 문자 작성

### 3.2 고객 목록

- 상단: 검색창, 저장 필터, 고객 등록 CTA
- 본문: 이름/연락처/등급/최근 방문/누적 매출/포인트/담당자 테이블
- 우측 drawer: 기본정보, 예약, 시술, 결제, 포인트, 쿠폰, 문자 탭
- 대량 작업: 그룹 변경, 등급 변경, 문자 발송, 인쇄

### 3.3 예약 보드

- 날짜 navigator + 월/주/일 보기
- 디자이너별 컬럼과 시간축
- 예약 상태를 색상만으로 구분하지 않고 텍스트/아이콘 병기
- 예약 생성은 빈 슬롯 클릭 → 고객 → 시술 → 담당자 → 확인 4단계
- 중복 예약은 즉시 경고하고 관리자 설정에 따라 차단/허용

### 3.4 결제/매출

- 좌측: 고객과 시술 장바구니
- 중앙: 결제 수단별 금액 입력
- 우측: 할인·포인트·VAT·수수료·인센티브·샵 수익 계산
- 저장 전 요약 확인
- 매출 분석은 KPI 카드 + 표 + 작은 추이 차트 조합

### 3.5 문자 캠페인

- 대상 선택 → 메시지 작성 → 예약/즉시 발송 → 검토의 단일 흐름
- SMS/LMS 차이를 탭으로 단순화
- 샘플/저장 템플릿을 우측 목록으로 제공
- 수신 거부자, 예상 차감 건수, 예약 시각을 발송 전에 노출

### 3.6 설정

- 설정 허브를 6개 그룹으로 분리: 매장, 직원, 고객정책, 서비스·가격, 문자 자동화, 외부연동
- 기존의 팝업 설정은 full-screen modal 또는 설정 detail page로 변환

## 3.7 상세 설계 산출물

- Figma: [Hairhaeyo Salon Management Web App](https://www.figma.com/design/7A6bEGubfakhvXLpOPmk1o)
- Foundations: `2:2`
- Components: `4:2`
- 오늘 대시보드: `5:2`
- 고객 목록 + 상세 drawer: `5:114`
- 디자이너 예약 보드: `5:256`
- 시술 결제: `5:352`
- 구현 규격: [`docs/superpowers/specs/2026-07-30-hairhaeyo-ui-design.md`](docs/superpowers/specs/2026-07-30-hairhaeyo-ui-design.md)
- 위험 작업은 별도 확인과 변경 이력 제공

## 4. 시각 언어

### 4.1 색상

- 배경: warm ivory `#F7F5F0`
- 표면: white `#FFFFFF`
- 본문: ink `#202124`
- 보조: slate `#687078`
- 브랜드 accent: deep plum `#5C344F`
- 보조 accent: muted rose `#B77D8F`
- 성공: sage `#5B806D`
- 경고: amber `#B27A38`
- 오류: brick `#B84A4A`

색상만으로 상태를 전달하지 않는다. 예약 상태·문자 상태·결제 상태는 배지 텍스트와 아이콘을 함께 쓴다.

### 4.2 타이포그래피

- 한국어 UI: Pretendard 또는 시스템 산세리프
- 숫자/KPI: 동일 계열의 medium/semibold
- 제목은 크게, 본문은 14~15px, 테이블은 13~14px
- 장식용 세리프는 브랜드 hero/빈 상태에만 제한적으로 사용

### 4.3 컴포넌트

- AppShell, Sidebar, TopSearch, PageHeader
- KPI Card, Status Badge, Data Table, Filter Bar
- Calendar/Timeline, Customer Drawer, Payment Panel
- Modal, Confirm Dialog, Toast, Empty State
- Textarea byte counter, phone input, date/time picker
- 권한별 숨김은 CSS가 아니라 서버/API 권한으로 보장
- Tailwind utility 조합을 기본으로 사용하고 반복되는 UI만 React 컴포넌트로 추출
- 조건부 class 조합은 기존 의존성이 없으면 템플릿 문자열로 처리

## 5. 접근성/운영성

- WCAG AA 대비
- 모든 입력에 label, 오류 문구, 키보드 포커스
- 테이블 정렬·필터 상태 URL 또는 쿼리로 보존
- 자동 저장하지 않는 폼은 이탈 경고
- 문자 발송·삭제·환불은 되돌릴 수 없음을 명확히 표시
- 개인정보는 목록에서 전화번호 일부 마스킹 옵션 제공
- 고객·매출·문자·설정 변경 감사 로그

## 6. 반응형 범위

- 사용 목표는 데스크톱 웹앱
- 1280px 미만에서는 사이드바 축소와 표 가로 스크롤
- 태블릿/모바일 전용 화면은 이번 범위에서 만들지 않는다.
- 단, 브라우저 확대 125%와 키보드 탐색은 지원한다.

## 7. Figma 작업 순서

1. Foundations: 색상, 타입, spacing, radius, shadow, 상태 토큰
2. AppShell: 사이드바·상단검색·페이지 헤더
3. Core components: 테이블, drawer, modal, badge, form, date/time
4. 대표 화면 4개: 오늘, 고객, 예약, 결제
5. 문자·상품·직원·설정 화면
6. 권한 상태, 빈 상태, 오류 상태, 긴 텍스트, 대량 데이터 변형
7. 프로토타입: 고객 등록→예약→결제→문자 자동화 흐름

## 8. Figma 작성 규칙

- 기존 Figma 파일이 있으면 먼저 페이지/컴포넌트/변수 확인
- 공통 컴포넌트부터 만들고 화면마다 복사하지 않는다.
- 긴 작업은 토큰→컴포넌트→대표 화면→검증 순으로 작은 단위로 저장
- 각 생성/수정 단계에서 node ID를 기록하고 metadata/screenshot으로 검증
- 실제 개발에서는 Figma 산출물을 기준으로 하되, 기능 인벤토리와 불일치하면 기능 인벤토리를 우선 확인한다.
- Figma 색상·간격·radius·shadow 토큰 이름은 Tailwind theme/CSS 변수 이름과 맞춘다.

## 9. 디자인에서 생략한 것

- 참고 사이트의 랜딩페이지 애니메이션·화려한 3D 효과는 운영 콘솔에 필요하지 않아 제외
- 모바일 전용 IA는 요청 범위가 웹앱이므로 제외
- 새 UI 라이브러리 도입은 코드베이스와 기존 의존성 확인 후 결정
- Tailwind CSS로 충분한 시각 효과를 위한 별도 CSS-in-JS 도입은 제외
