# Hairhaeyo owner operations QA — 2026-08-03

## 범위

- 데스크톱 웹 전용: Chrome 1280×900, 1440×1000.
- Next.js production standalone과 Tauri Windows 패키지.
- 경로: `/`, `/customers`, `/bookings`, `/sales`, `/sales/transactions`, `/messages`, `/operations`, `/settings`.
- 기준 문서: `FUNCTION.md` 상위 253개, 하위 10개, 총 263개 기능.

## 웹 브라우저 결과

- 원장 로그인·로그아웃, 고객 등록·수정·검색·상세 이동, 대기 고객 처리, 예약 등록·수정·상태 변경·취소·중복 차단을 확인했다.
- 결제는 불변 원장을 유지하고 환불·정정은 원본과 연결된 보정 거래로 남는다.
- 매출은 오늘·월·총매출과 시술·성별·방문·결제수단 분석을 같은 서버 집계로 표시한다.
- 막대 차트 금액은 끝에 항상 표시되고 막대 tooltip은 없다. 원형 차트 tooltip은 유지된다.
- 매출 진입 motion과 `prefers-reduced-motion` 즉시 정착 상태를 자동 테스트로 확인했다.
- 상품·쿠폰 화면은 승인된 범위에 따라 제외했다. 선불권은 별도 잔액 기능 없이 결제수단으로만 유지한다.
- 문자 기능은 외부 전송을 주장하지 않는 dry-run으로 동작한다.
- 설정에서 매장명·원장 표시 이름을 저장하며 기본 매장명은 `수원 본점`이다.
- Chrome console error: 0.

## 네이버 예약 메일 연동

- 수신 전용 IMAP TLS `imap.naver.com:993`을 사용한다. SMTP·발송 기능은 없다.
- 화면에 다음 8단계가 모두 표시된다.
  1. 네이버 예약 메일 연동 클릭
  2. 연동 방식·개인정보 안내
  3. 네이버 메일 주소 입력
  4. 애플리케이션 비밀번호 입력
  5. 연결 테스트
  6. 예약 관련 메일 자동 탐색
  7. 초기 예약 데이터 불러오기
  8. 앱 실행 시 신규 메일 동기화
- 신청·확정·변경·취소를 분류하고 예약번호로 통합한다. 같은 UID와 낮은 UID는 무시한다.
- 발신자, 제목, `dkim=pass`와 `header.d=naver.com`을 모두 확인한다. DKIM 없음·실패·SPF만 통과한 메일은 무시한다.
- 취소는 예약을 보관 처리하면서 상태 이력과 감사 처리자 `원장`을 유지한다.
- 초기 import와 이후 신규 UID 증분 동기화를 지원한다. DB 저장이 실패하면 checkpoint를 갱신하지 않는다.
- 시작 동기화는 프로세스당 성공 1회이며 동시 요청은 같은 Promise를 공유한다. 실패 후에는 재시도할 수 있다.
- 비밀번호는 `Hairhaeyo:NaverBookingMail` Windows Credential Manager 항목에만 저장한다.
- 비밀번호는 argv, URL, SQLite, 로그, 감사 payload, 오류 문구, HTML에 저장하거나 표시하지 않는다.
- 실제 Chrome에서 잘못된 `owner@gmail.com`과 가짜 비밀번호를 제출했을 때 `입력 내용을 수정하세요: 네이버 메일 주소를 확인하세요.`가 표시됐다.
- 가짜 비밀번호의 URL·본문·HTML·재렌더된 password value 잔존 수는 모두 0이었다.
- 설정 외부 연동 화면은 `상태: 연결 안 됨`, `/bookings` 이동 링크를 표시했고 secret/password 필드는 0개였다.

## 화면 크기·시각 결과

- 1280×900: `clientWidth=1265`, `scrollWidth=1265`, 가로 스크롤 없음.
- 1440×1000: `clientWidth=1425`, `scrollWidth=1425`, 가로 스크롤 없음.
- 네이버 8단계 grid, 개인정보 안내, 이메일·비밀번호 입력, 버튼, 재시도 이력의 정렬·clipping 문제 없음.
- 대체 안내 FAQ와 공식 도움말 4개 링크를 확인했고 1280·1440에서 가로 overflow가 없었다.
- Pretendard Variable을 로컬에서 사용하며 한국어 label, form control, 표, 차트 label 정렬을 확인했다.
- 키보드 focus, semantic label, 색상 외 상태 문구를 유지한다.

## Tauri·패키지 결과

- `npm run tauri:build` 성공.
- 실행 파일: `src-tauri/target/release/hairhaeyo.exe`.
- installer: `src-tauri/target/release/bundle/nsis/Hairhaeyo_0.1.0_x64-setup.exe`.
- installer 크기: 30,513,303 bytes.
- source, standalone, release의 `windows-credential.ps1` SHA-256가 모두 `B9B3BBBA94736BE016059C1E2DD67D41AB6A70F1A981646A9521F9DEEF242BE0`으로 일치한다.
- 이전 Tauri runtime smoke에서 sidecar가 `127.0.0.1:3210` login을 제공하고 창 종료 후 listener가 제거되는 것을 확인했다.
- prebuild가 이전 Tauri resource junction과 `target/*/server` 생성물을 제거한다. 최신 standalone과 release server의 재귀 `src-tauri` 포함 수는 0이다.
- SQLite는 Tauri app-data에 저장되고 sidecar는 loopback에만 bind한다.
- readiness는 실행마다 생성한 256-bit health token을 사용한다. token이 없거나 틀리면 403이다.

## 자동 검증

- Vitest: 30 files, 188/188.
- TypeScript strict: 통과.
- Next production build: 12/12 pages.
- Cargo: 3/3.
- `npm audit --omit=dev`: 취약점 0.
- 실제 disposable Credential Manager write/read/delete: 통과.
- 이전 제품명 문자열: 0.
- coverage pending: 0.
- secret/static legacy field scan: 0.
- `FUNCTION.md` 263/263 기능은 route, component, server operation, integration, background job 또는 승인된 대체 흐름에 매핑된다.
