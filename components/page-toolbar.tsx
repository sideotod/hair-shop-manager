import { typeScale } from "./type";

/**
 * 본문 첫 줄 — 설명문 왼쪽, 액션 오른쪽. 여덟 화면에 같은 마크업이 복붙돼 있었고
 * 그 사이에서 글자 크기(`text-sm` vs `text-[13px]`)가 조용히 갈렸다.
 */
export function PageToolbar({ children, className = "", description, title }: {
  children?: React.ReactNode;
  /** 툴바가 본문 첫 줄이 아닐 때의 위 여백. 매출 워크스페이스는 탭 줄이 먼저 온다. */
  className?: string;
  description: React.ReactNode;
  title?: string;
}) {
  return <div className={`${className ? `${className} ` : ""}flex items-start justify-between gap-6`}>
    <div>
      {title && <h2 className={typeScale.title}>{title}</h2>}
      <p className={`${title ? "mt-1 " : ""}text-sm text-[var(--muted)]`}>{description}</p>
    </div>
    {children && <div className="flex shrink-0 gap-2">{children}</div>}
  </div>;
}
