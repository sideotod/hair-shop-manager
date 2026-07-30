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
