# Hairhaeyo Revenue Visualization Motion Design

## Decision

Hairhaeyo 매출 분석 화면에만 짧은 진입 motion을 적용한다. Recharts 3의 내장 SVG tween을 사용하며 `motion`, Framer Motion, GSAP 같은 runtime dependency는 추가하지 않는다.

## Considered approaches

1. **Recharts native animation — selected.** 기존 chart geometry, responsive resize, tooltip, click payload를 그대로 유지하면서 `isAnimationActive`, `animationBegin`, `animationDuration`, `animationEasing`만 제어한다.
2. **CSS clip-path/scale animation.** 더 세밀하지만 Recharts가 계산한 SVG 좌표와 responsive resize를 이중 관리해야 한다.
3. **External motion library.** orchestration은 강력하지만 현재 화면의 단발성 chart reveal에 비해 dependency와 hydration 복잡도가 크다.

## Motion behavior

- 일별 line: 왼쪽에서 오른쪽으로 560ms draw.
- 결제 pie: 80ms 뒤 520ms sweep.
- 시술 horizontal bar: 왼쪽 기준 500ms reveal.
- 담당자 grouped bar: 매출 480ms, 샵 수익은 80ms 뒤 480ms rise.
- 공제 bar: 520ms rise.
- easing: `ease-out`.
- KPI, filter, value button, table, drawer 위치에는 진입 motion을 추가하지 않는다.
- filter로 새 server aggregate가 도착하면 chart geometry만 다시 tween한다. 기존 layout 위치와 높이는 변하지 않는다.
- legend toggle은 해당 series만 짧게 나타나며 grid/card reflow animation은 없다.

## Accessibility

- `prefers-reduced-motion: reduce`에서는 모든 Recharts animation을 비활성화한다.
- server snapshot은 reduced 상태로 렌더링해 reduced-motion 사용자가 hydration 전에 animation을 보지 않게 한다.
- chart의 semantic table, keyboard value button, tooltip, drilldown drawer 동작은 motion과 독립적으로 유지한다.
- animation 종료 여부가 기능 사용 조건이 되지 않는다.

## Motion skill integration

- Installed reference: `joepUI/motion-ref-skill` (`motion-ref`, MIT).
- Applied patterns: line draw, pie slice reveal, horizontal/vertical bar reveal.
- Applied limits: functional motion, short duration, one direction per chart, reduced-motion opt-out.

## Verification

- Unit: normal/reduced chart motion configuration.
- Playwright normal context: initial frame and settled frame의 SVG geometry 또는 animation state가 달라야 한다.
- Playwright reduced context: initial/settled geometry가 같고 animation state가 없어야 한다.
- 1280×900: no horizontal overflow, no chart/card movement, controls remain actionable during animation.
- Existing filter, legend, drawer focus, CSV/table contracts remain green.

