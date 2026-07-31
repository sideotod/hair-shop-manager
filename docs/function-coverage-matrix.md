# FUNCTION.md 기능 커버리지 매트릭스

`FUNCTION.md` 원문 bullet 263개를 순서와 문구 그대로 보존한다. 구현 위치는 승인된 owner-operations 계획의 route/module/test를 가리킨다.

| 기능 | 상태 | 구현 위치 | 검증 |
|---|---|---|---|
| 로그인 세션 유지, 로그아웃 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 상단 공통 고객 검색 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 검색 기준: 핸드폰 뒷번호/고객명, 닉네임, 전화번호 뒷번호, 그룹명, 메모, 주소, 방문동기, 이메일, 포인트 카드, 패밀리번호 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 회원 검색 후 고객 정보·시술 결제 내역·상품 판매 내역을 관련 화면에 연동 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 이전 화면 이동 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 인쇄 기능 및 인쇄용 화면 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 공지/가이드/FAQ 열기 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 금일 대기 고객, 금일~글피 예약 수, SMS 잔여 건수 요약 | 연동 확인 필요 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 금일 대기 고객 입력: 고객명, 메모, 등록 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 대기 고객 선택 시 회원 결제 화면으로 이동 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 공지사항 조회, 공지 글 작성 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 고객 검색 폼은 대부분의 관리 화면에 공통 노출 | 구현 예정 | app/page.tsx; components/app-shell.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 금일 대기 고객 현황 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 금일/내일/모레/글피 예약 건수 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 날짜별 예약 현황 팝업 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| SMS 발송 가능 건수 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 회원 등록 후 자동문자 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 예약 접수 후 자동문자 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 결제 등록 후 자동문자 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 예약 당일 자동문자 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 결제 등록 1차/2차 자동문자 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 생일 자동문자 당일/1일 후 상태 | 연동 확인 필요 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 공지 안내 목록 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 기존 시스템 이용 가이드 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| FAQ | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 고객센터/도움말 연결 | 구현 예정 | app/page.tsx; components/dashboard/dashboard-page.tsx | components/dashboard/dashboard-page.test.tsx; Playwright |
| 성명 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 성별 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 휴대전화, 휴대전화 없음 표시 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 일반 전화 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 주소/우편번호 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 이메일 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| SMS 수신 허용/거부 | 연동 확인 필요 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 닉네임 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 생일 연/월/일 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 생일 양력/음력 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 포인트 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 패밀리번호 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 담당 직원 | 원장 1인 대체 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 등급: 일반, 특별1, 특별2 및 설정된 등급 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 그룹 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 방문 동기 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 메모 150자 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 첫 만남 날짜 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 가입일 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 등록 직후 SMS 발송/미발송 | 연동 확인 필요 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 등록 직후 예약 날짜·시간 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 포인트 카드 번호 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 대기 고객 동시 등록 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 10개 검색 조건 선택 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 검색 결과 목록 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 회원 상세 조회 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 정보 수정 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 삭제/이동 여부 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 시술 이력 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 상품 구매 이력 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 포인트 이력 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 쿠폰/선불권 잔액 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 예약 이력 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객별 문자 발송 이력 `[추가확인]` | 연동 확인 필요 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 파워 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 매출액 기준 우수/특별 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 등급별 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 그룹별 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 성별 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 방문 동기별 고객 검색 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 최근 방문/미방문 기준 검색 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 생일 대상 검색 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 검색 결과 대상자 SMS 발송 | 연동 확인 필요 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 검색 결과 인쇄 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 목록 인쇄 형식 1~4 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 대기 고객 이름·메모 입력 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 대기 고객 등록 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 등록 대기 고객 목록 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 등록 회원이면 결제 화면으로 이동 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 대기 고객 삭제/완료 처리 `[추가확인]` | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 그룹 등록/수정 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 방문 동기 등록/수정 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 우수/특별 고객 기준과 할인율 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 포인트 시작값/적립 기준/사용 제한 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 생일 양력·음력 표시 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 SMS 수신 기본값 | 연동 확인 필요 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 고객 화면 표시/이동 설정 | 구현 예정 | app/customers/page.tsx; app/customer-actions.ts | components/customers/customers-page.test.tsx; Playwright |
| 회원/비회원 선택 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 시술 대분류 선택: 컷, 펌, 매직, 드라이, 클리닉, 염색, 업스타일, 매니큐어, 세트메뉴, 기타 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 시술 상세 분류 선택 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 상세 스타일명 직접 입력 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 고객 검색 연동 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 최종 결제금액 직접 수정 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제 수단별 금액 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 현금 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 현금영수증 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 카드 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 포인트 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 이체 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| N페이 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 기타 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 지역페이 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 포인트 적립 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 담당 디자이너/시술자 | 원장 1인 대체 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 메모 150자 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 선택 메모/약품 메모 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 두피 상태·모발 특징 메모 `[추가확인]` | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제일·시간 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제 당일 SMS 발송/미발송 | 연동 확인 필요 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| VAT 포함/별도 처리 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 할인율 적용 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 수수료 계산 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 디자이너 인센티브 계산 | 원장 1인 대체 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 샵 수익 계산 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제 저장 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 일별 매출 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 월별 매출 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 기간별 매출 `[추가확인]` | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 시술 유형별 매출 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 디자이너별 매출 | 원장 1인 대체 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제 수단별 매출 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 현금영수증/카드/N페이 등 결제 구분 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| VAT | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 결제 수수료 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 인센티브 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 샵 수익 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 매출 내역 수정 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 매출 내역 인쇄 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 계정/매출 출력 | 구현 예정 | app/sales/page.tsx; app/payment-actions.ts; components/sales/revenue-dashboard.tsx | lib/finance.test.ts; components/sales/revenue-dashboard.test.tsx; Playwright |
| 상품 판매 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 회원/비회원 연결 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 판매 직원 | 원장 1인 대체 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 상품명/매입처 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 판매금액 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 원가 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| VAT | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 수수료 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 인센티브 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 샵 수익 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 포인트 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 메모 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 상품 판매 이력 조회 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 상품 판매 이력 수정 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 선불쿠폰 대분류 설정 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 선불티켓/쿠폰명 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 쿠폰 가격 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 고객별 쿠폰 판매 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 쿠폰 차감 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 쿠폰 잔액/사용 이력 `[추가확인]` | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 차감 시 간편 메모 | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 쿠폰 발송 자동문자 설정 | 연동 확인 필요 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 쿠폰 판매·차감 매출 반영 `[추가확인]` | 구현 예정 | app/products/page.tsx; app/product-actions.ts | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 지출 내역 등록 | 구현 예정 | app/sales/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 지출 항목 사전 등록 | 구현 예정 | app/sales/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 기간별 지출 조회 `[추가확인]` | 구현 예정 | app/sales/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 매출·지출 조정/정산 | 구현 예정 | app/sales/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 조정 내역 수정/인쇄 `[추가확인]` | 구현 예정 | app/sales/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 받는 사람 최대 3명 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 보내는 사람 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| SMS 단문 / LMS 장문 | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 메시지 바이트 표시 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 즉시 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 예약 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 예약 연/월/일/시/분 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 회원 SMS 수신 거부 제외 | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 발송 건수 차감 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 전체 회원 대상 SMS | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 전체 회원 대상 LMS | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 여성 회원 대상 SMS | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 여성 회원 대상 LMS | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 남성 회원 대상 SMS | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 남성 회원 대상 LMS | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 파워 고객 검색 대상 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 샘플 문자 불러오기/복사 | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 자주 쓰는 문자 템플릿 `[추가확인]` | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 발송 가능 건수 확인 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 신규 회원 등록 후 발송 여부·지연시간·문구 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 예약 접수 후 발송 여부·지연시간·문구 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 결제 등록 후 발송 여부·지연시간·문구 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 결제 등록 후 1차 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 결제 등록 후 2차 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 결제 후 재방문 주기별 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 생일 자동 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 예약 당일/전일 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 예약 방문일 추가 문구 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 선불쿠폰 판매 후 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 선불쿠폰 차감 후 발송 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| SMS/LMS 문구 편집 | 연동 확인 필요 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 문구 바이트 확인 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 발송 예약 시각 설정 | 구현 예정 | app/messages/page.tsx; app/message-actions.ts; lib/messages.ts | lib/messages.test.ts; components/messages/messages-page.test.tsx; Playwright dry-run |
| 월/일/기간 예약 현황 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 날짜별 예약 목록 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 등록 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 고객 검색/신규 고객 연결 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 시간 선택 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 담당 디자이너 선택 | 원장 1인 대체 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 시술 메뉴 선택 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 메모 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 상태 변경 `[추가확인]` | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 수정/취소 `[추가확인]` | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 중복 허용/차단 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 고정 운영시간 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 시간 단위 설정 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 당일/전일 알림 | 구현 예정 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 예약 방문일 문자 추가 문구 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 스마트 플레이스 회원 가입 안내 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 예약 코드 등록 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 계정/매장 정보 입력 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 예약 ID·코드·매장명·담당자·전화번호·메모 저장 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 예약 연동 FAQ | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 고객센터 연결 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 페이센터 연결 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 예약 설정 참고 자료 | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 네이버 예약 데이터 동기화 `[추가확인: 실제 API/동기화 주기/충돌 규칙]` | 연동 확인 필요 | app/bookings/page.tsx; app/booking-actions.ts; lib/booking.ts | lib/booking.test.ts; components/bookings/bookings-page.test.tsx; Playwright |
| 직원 목록 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원 등록/수정/삭제 `[추가확인]` | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원 로그인/비밀번호 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 담당 고객 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 시술 매출 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 상품 매출 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 인센티브율 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 수수료율 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원별 화면 접근/메뉴 노출 | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 직원/샵 운영 권한 `[추가확인]` | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 디자이너별 예약 가능 여부 `[추가확인]` | 원장 1인 대체 | lib/auth.ts; components/app-shell.tsx; docs/superpowers/specs/2026-07-31-hairhaeyo-owner-operations-design.md | lib/auth.test.ts; components/dashboard/dashboard-page.test.tsx; Playwright |
| 시술 대분류명 수정 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 시술 상세 메뉴 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 시술 가격 등록/수정 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 상품 대분류/상품명/가격 `[추가확인]` | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 판매 직원 연결 | 원장 1인 대체 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 두피 상태 사전 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 모발 특징 사전 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 선택 메모 사전 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 사은품 등록 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 편리한 메모 선택값 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 가격표/시술 분류 팝업 | 구현 예정 | app/products/page.tsx; app/product-actions.ts; components/products/products-page.tsx | lib/coupons.test.ts; components/products/products-page.test.tsx; Playwright |
| 매장명 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 매장 전화번호 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 비밀번호 변경/확인 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 관리자 비밀번호 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 고객 화면 색상: 배경/전경 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 고객 화면 이동 방식 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 고객 화면 표시 방식 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 화면별 메뉴 숨김/노출 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| SMS 기능 사용 여부 | 연동 확인 필요 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 기본 성별/기본 SMS 수신값 | 연동 확인 필요 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 고객 등급·그룹·방문 동기 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 포인트 시작값/한도/적립 방식 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 직원별 수수료·인센티브 기준 | 원장 1인 대체 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| VAT 설정 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 카드 수수료율 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 쿠폰 VAT 설정 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 상품 VAT 설정 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 예약 중복 허용 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 고정 운영 시작/종료 시간 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 자동문자 전체 설정 | 연동 확인 필요 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 예약 추가 문구 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 네이버 예약 연동 설정 | 연동 확인 필요 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 서비스 약관/도움말/FAQ/공지 | 구현 예정 | app/settings/page.tsx; app/settings-actions.ts; components/settings/settings-page.tsx | components/settings/settings-page.test.tsx; Playwright |
| 테스트 계정의 샘플 데이터가 없어 검색 결과·매출 수치·예약 충돌·쿠폰 잔액의 실제 규칙은 확정할 수 없다. | 구현 예정 | docs/function-coverage-matrix.md; lib/salon-store.ts | lib/function-coverage.test.ts; lib/salon-store.test.ts; Playwright |
| 팝업 함수(`SerSort`, `SerMemo*`, `VPatron`, `AdjustExpense`, `Color`, `FAQnaver` 등)는 호출 지점과 입력 필드는 확인했지만 각 팝업 내부 저장/삭제 동작은 별도 테스트가 필요하다. | 구현 예정 | docs/function-coverage-matrix.md; lib/salon-store.ts | lib/function-coverage.test.ts; lib/salon-store.test.ts; Playwright |
| 외부 네이버 예약/네이버 페이 연동은 계정 권한과 API 계약 확인이 필요하다. | 연동 확인 필요 | docs/function-coverage-matrix.md; lib/salon-store.ts | lib/function-coverage.test.ts; lib/salon-store.test.ts; Playwright |
| 삭제·환불·예약 취소·문자 발송은 데이터 변경/외부 전송 기능이므로 리뉴얼 전 원장 데이터와 감사 로그 정책을 확정해야 한다. | 연동 확인 필요 | docs/function-coverage-matrix.md; lib/salon-store.ts | lib/function-coverage.test.ts; lib/salon-store.test.ts; Playwright |
| `Con.asp` 처리 endpoint는 화면에서 전송하지 않고 폼 구조만 확인했다. | 구현 예정 | docs/function-coverage-matrix.md; lib/salon-store.ts | lib/function-coverage.test.ts; lib/salon-store.test.ts; Playwright |
| 기능 누락 방지 기준은 “메뉴 화면 + 하위 화면 + 폼 필드 + 팝업 호출 + 자동화 설정”의 합집합이다. | 구현 예정 | FUNCTION.md; docs/function-coverage-matrix.md | lib/function-coverage.test.ts; docs/qa/hairhaeyo-owner-operations-qa.md |
| 리뉴얼에서는 기존 URL/ASP 명칭을 사용자에게 노출하지 않고 도메인 기능명으로 재구성한다. | 구현 예정 | FUNCTION.md; docs/function-coverage-matrix.md | lib/function-coverage.test.ts; docs/qa/hairhaeyo-owner-operations-qa.md |
| 기능 제거는 하지 않는다. 사용 빈도 낮은 기능은 설정/고급 영역으로 이동한다. | 구현 예정 | FUNCTION.md; docs/function-coverage-matrix.md | lib/function-coverage.test.ts; docs/qa/hairhaeyo-owner-operations-qa.md |
