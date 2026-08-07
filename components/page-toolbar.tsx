/**
 * 본문 첫 줄 — 설명문 왼쪽, 액션 오른쪽. 여덟 화면에 같은 마크업이 복붙돼 있었고
 * 그 사이에서 글자 크기(`text-sm` vs `text-[13px]`)와 `no-print` 유무가 조용히 갈렸다.
 *
 * `noPrint` 는 기본값을 두지 않는다. 인쇄 레이아웃은 화면마다 다르고
 * (`app/globals.css` 의 `@media print` 규칙), 기본값을 잘못 고르면 조용히 회귀한다.
 */
export function PageToolbar({ children, description, noPrint = false, title }: {
  children?: React.ReactNode;
  description: React.ReactNode;
  noPrint?: boolean;
  title?: string;
}) {
  return <div className={`${noPrint ? "no-print " : ""}flex items-start justify-between gap-6`}>
    <div>
      {title && <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>}
      <p className={`${title ? "mt-1 " : ""}text-sm text-[var(--muted)]`}>{description}</p>
    </div>
    {children && <div className="flex shrink-0 gap-2">{children}</div>}
  </div>;
}
