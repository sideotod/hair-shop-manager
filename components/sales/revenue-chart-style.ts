/**
 * 매출 차트 3종(일별·월별·연도별)이 공유하는 표면 규칙.
 *
 * 이중 베젤: 바깥 껍데기는 공용 카드 표면(`../surface`), 안쪽 플롯 우물은 컨트롤 반경(9px).
 * 반경은 `globals.css` 의 토큰 4종 밖으로 나가지 않는다.
 * 서버 컴포넌트에서 쓰이므로 이 파일에는 `"use client"` 를 붙이지 않는다.
 */
import { surface } from "../surface";

export const chartShell = `flex flex-col ${surface}`;

/** 플롯이 앉는 안쪽 코어. 살짝 눌린 면으로 만들어 막대·선이 위로 떠 보이게 한다. */
export const chartWell =
  "rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)]/55 shadow-[inset_0_1px_2px_rgba(13,21,18,0.05)]";

/** 스프링에 가까운 감속 곡선. `linear`/`ease-in-out` 은 쓰지 않는다. */
export const chartEase = "cubic-bezier(0.32,0.72,0,1)";
