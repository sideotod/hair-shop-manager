/**
 * 카드 표면 단일 정의.
 *
 * 같은 그림자 문자열이 여섯 파일(`bookings` `dashboard` `operations` `revenue-dashboard`
 * `sales-controls` `settings`)에 복붙돼 있었고, 그 옆에서 Tailwind 기본 그림자
 * (`shadow-sm` `shadow-lg` `shadow-2xl`)가 섞여 나왔다. 기본 그림자는 **순수 검정**이라
 * 배경(`--background: #f2f1ed`, 따뜻한 회색)과 색이 어긋나 회색 얼룩처럼 보인다.
 * 그림자는 배경 색조(13,21,18)로 물들인다.
 *
 * 여백은 `p-5`(20px) 하나다. 이전에는 카드마다 `p-5` `p-6` `p-7` 이 섞였다.
 * 운영 화면은 밀도가 정보라서 카드가 넓어질수록 한 화면에 들어오는 행이 줄어든다.
 *
 * 모서리는 `--radius-card` 밖으로 나가지 않는다 (`globals.css` 의 네 단계 스케일).
 */
const tintedShadow = "shadow-[0_1px_2px_rgba(13,21,18,0.04),0_14px_30px_-20px_rgba(13,21,18,0.25)]";

/** 자체 여백을 직접 정하는 표면 (표·목록처럼 가장자리까지 채우는 내용). */
export const surface = `rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] ${tintedShadow}`;

/** 기본 카드. 표면 + 표준 여백. */
export const card = `${surface} p-5`;

/**
 * 화면 위로 뜨는 표면 (헤더 드롭다운·드로어·로그인). 같은 색조를 더 깊게 쓴다.
 * 순수 검정 `shadow-lg` 를 쓰면 같은 화면 안에서 그림자 색이 두 가지가 된다.
 */
export const floatingShadow = "shadow-[0_2px_6px_rgba(13,21,18,0.06),0_28px_60px_-24px_rgba(13,21,18,0.42)]";
