# Hairhaeyo Tauri and Branding Design

## Goal

기존 Next.js 웹 실행을 유지하면서 Hairhaeyo를 Windows용 Tauri 데스크톱 앱으로도 배포한다. 현재 Server Actions와 `node:sqlite`를 재작성하지 않고, 매장명·원장명·한글 타이포그래피를 설정 기반으로 통일한다.

## Selected architecture

Tauri 공식 Next.js 정적 export 방식은 서버 기반 기능을 지원하지 않아 현재 구조와 맞지 않는다. Rust로 전체 도메인 로직을 다시 작성하는 방식도 기능 누락 위험과 중복 구현이 크다. 따라서 다음 dual-target 구조를 사용한다.

- 웹: 기존 `npm run dev`, `npm run build`, Next.js App Router/Server Actions 유지.
- Tauri 개발: `beforeDevCommand`로 Next dev server를 시작하고 `http://localhost:3000`을 1440px 창에서 연다.
- Tauri 배포: Next `standalone` 산출물과 현재 Node 실행 파일을 Tauri sidecar/resource로 묶는다. Rust는 loopback 전용 Next server를 시작한 뒤 WebView를 연결한다.
- DB: 웹은 기존 `.data/hairhaeyo.sqlite`; Tauri 배포는 앱 데이터 디렉터리의 `hairhaeyo.sqlite` 경로를 환경변수로 Next sidecar에 전달한다.
- 모바일 레이아웃은 만들지 않는다. 창 최소 너비는 1280px, 기본 너비는 1440px이다.

참고:

- [Tauri Next.js guide](https://v2.tauri.app/start/frontend/nextjs/)
- [Tauri external binary guide](https://v2.tauri.app/develop/sidecar/)

## Tauri boundaries

- Tauri는 브라우저 웹앱을 대체하지 않고 추가 배포 셸로 동작한다.
- Node sidecar는 `127.0.0.1`에만 바인딩하며 외부 네트워크에 노출하지 않는다.
- sidecar 종료는 Tauri 앱 종료와 함께 처리한다.
- 개발 단계에서는 표준 Tauri dev URL을 사용한다. standalone sidecar 패키징은 최종 QA Task에서 검증한다.
- Tauri 설정/바이너리 준비는 별도 UI 기능으로 보지 않으며 `FUNCTION.md` 기능 수를 변경하지 않는다.

## Typography

`Pretendard Variable`을 로컬 WOFF2로 번들한다. 관리 화면의 긴 한글 문장, 작은 표 글씨, 큰 KPI 숫자에서 동일한 리듬을 유지하고 Windows/macOS 간 차이를 줄인다.

- 출처: [orioncactus/pretendard](https://github.com/orioncactus/pretendard)
- 라이선스: SIL Open Font License 1.1
- 로딩: `next/font/local`, `display: swap`, CSS 변수 `--font-pretendard`
- 범위: 본문, 입력, 표, 차트 레이블, 인쇄 화면
- 숫자: `font-variant-numeric: tabular-nums`를 KPI/금액/시간에 유지
- CDN 의존 없음. 폰트 파일과 OFL 문서를 저장소에 포함한다.

## Shop and owner identity

- 기본 매장 표시명은 `수원 본점`이다.
- 불변 감사 actor는 계속 `원장`으로 기록한다.
- 설정값 `ownerName`은 UI 표시 전용이다. 기본값은 `원장`이며 화면에서는 `원장님`으로 표시한다.
- 원장명이 `이수진`으로 저장되면 상단 계정 표시는 `이수진 원장님`이 된다.
- Task 2는 `AppShell`이 `shopName`과 `ownerName`을 받아 표시하도록 만든다.
- Task 8 설정 화면에서 두 값을 수정하고 감사 이력을 남긴다.

## Task 2 UI behavior

- 사이드바 하단 매장 카드: 설정의 `shopName`, 영업시간.
- 상단 계정: 설정의 `ownerName`, 도움말, SMS 잔여량, 로그아웃.
- `직원 · 설정` 문구는 `설정`으로 변경한다.
- 대시보드의 직원/디자이너 영역은 제거하고 대기 고객, 단일 원장 예약, 자동화, 공지, 감사 이력으로 교체한다.
- Tauri 창에서도 브라우저와 같은 URL, 키보드, focus, print 동작을 사용한다.

## Error handling

- Rust toolchain 또는 Windows 빌드 도구가 없으면 Task 2에서 설치하고 `cargo check`로 확인한다.
- Next dev server 시작 실패 시 Tauri dev 명령이 실패 상태를 반환한다.
- 배포 sidecar가 준비 시간 안에 loopback 포트를 열지 못하면 창에 오류 화면을 표시하고 프로세스를 종료한다.
- 폰트 로딩 실패 시 시스템 산세리프 fallback을 사용한다.

## Verification

- `npm test -- lib/salon-store.test.ts lib/auth.test.ts components/dashboard/dashboard-page.test.tsx`
- `npm run typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run tauri:info`
- Playwright 1280×900, 1440×1000에서 한글 정렬·overflow 확인
- 최종 Task에서 `npm run tauri:build`와 설치 산출물 실행 확인

## Self-review

- Next 서버 기능과 Tauri 정적 export 제약의 충돌을 sidecar로 명시적으로 해결했다.
- 웹 실행을 제거하지 않는다.
- 매장명과 원장 표시명은 설정 데이터가 단일 source of truth다.
- 폰트 출처, 라이선스, 로컬 번들 방식이 확정됐다.
- 모바일 UI나 별도 Rust 도메인 구현을 추가하지 않는다.
