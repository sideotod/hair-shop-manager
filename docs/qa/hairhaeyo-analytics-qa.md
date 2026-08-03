# Hairhaeyo analytics QA — 2026-07-30

## Scope

- Chrome + Playwright browser control
- Routes: `/`, `/sales`, `/sales/transactions`
- Viewports: 1280×800, 1440×900, 1920×1080
- Interactions: URL filters, series toggle, keyboard value drilldown, SVG mark drilldown, Escape, focus restoration, filtered transaction navigation

## Results

- `/`: no horizontal overflow at 1280, 1440, 1920.
- `/sales`: no horizontal overflow or clipped filter controls at 1280, 1440, 1920.
- 1280 regression before fix: `clientWidth=1265`, `scrollWidth=1314`, horizontal overflow present.
- 1280 after fix: `clientWidth=1265`, `scrollWidth=1265`, clipped filter controls `0`.
- Recharts hydrated at 1440 and 1920: 5 wrappers, 13 SVG elements, 33 paths.
- 담당자 filter changed URL to `staff=seoyun`.
- 총매출 series toggle changed `aria-pressed` to `false` and removed its legend series.
- 컬러 value button opened labelled dialog; Escape and the close button both removed `inert` and restored focus to the same button after drawer unmount.
- Drawer open state applies `inert` and `aria-hidden` to the full AppShell, including sidebar and header.
- Pie SVG mark opened `카드 결제수단 상세`; Escape restored focus to `data-revenue-chart="payment"`.
- Drilldown navigation preserved the RevenueQuery and selection parameters.
- Transaction-page back navigation preserved the RevenueQuery while dropping only drilldown selection parameters.
- Filter-dependent views no longer display hard-coded revenue interpretation copy.
- Filtered transaction route rendered 150 individual records beginning with `TX-20260724-001`.
- Transaction route had no horizontal overflow at 1280.
- Browser console warnings/errors: 0.

## Zoom note

Chrome zoom shortcuts did not expose a changed CSS viewport in the controlled extension session, so a distinct 125% zoom value could not be asserted. The effective minimum CSS width boundary was tested directly at 1280px with no overflow or clipped controls. Recheck native Chrome 125% zoom manually if release signoff requires browser chrome-level zoom evidence.

## Motion verification — 2026-07-31

- Normal-motion context, 1280×900: line paths used progressive `stroke-dasharray` values (`0.61 → 54.47 → 303.84 → settled`) rather than appearing at once.
- Normal-motion context, 1280×900: service bar width increased `43.17 → 146.62 → 287.63 → 293.44px`.
- Normal-motion context, 1280×900: staff bar height increased `27.37 → 91.66 → 169.87 → 171.17px`.
- Normal-motion context, 1280×900: deduction bar height increased `29.84 → 102.51 → 211.73 → 219.71px`.
- Normal-motion context, 1280×900: pie sector bounds increased from `34.14×6.45` to `192×147.27px`; the in-transition screenshot showed the line points before the connecting stroke and the pie before its completed sweep.
- Reduced-motion context, 1280×900: line, pie and all bar geometry was identical at initial, 120ms and settled samples. Recharts rendered final geometry immediately.
- Clicking the 컬러 value button during chart entry motion opened the labelled drawer without blocking interaction. AppShell became `inert`/`aria-hidden`, Shift+Tab and Tab wrapped between the two drawer controls, Escape closed the drawer, and focus returned to `service:컬러`.
- 총매출 series completed the full toggle cycle: line count `2 → 1 → 2`, `aria-pressed=true → false → true`.
- Selecting 오늘 updated the URL to `preset=today&start=2026-07-30&end=2026-07-30`, rebuilt server aggregates to `₩0 / 0건`, retained all five chart surfaces, and produced no horizontal overflow.
- Selecting 하린 after hydration updated the URL to `staff=harin` and rebuilt server aggregates to `₩8,640,000 / ₩5,010,000 / 42건`.
- Full dashboard at 1280px: `clientWidth=1280`, `scrollWidth=1280`, filter right edge `1240px`; no horizontal overflow, clipping, distorted Korean labels or broken chart alignment was observed.
- Transaction table at 1280px: page horizontal overflow `false`, table container `overflow-x:auto`, final 샵 수익 column visible, 150 filtered rows rendered.
- Empty-data exploratory state and animation-time drawer interaction remained stable. Browser console warnings/errors: `0`.
