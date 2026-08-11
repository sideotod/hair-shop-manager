import { loginOwner } from "../auth-actions";
import { DEMO_OWNER_PASSWORD, isDemoMode } from "../../lib/auth";
import { focusRing } from "../../components/button";
import { surface } from "../../components/surface";
import { typeScale } from "../../components/type";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const invalid = (await searchParams).error === "1";
  const demoMode = isDemoMode();

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-8">
      <section className={`w-full max-w-md p-8 ${surface}`} aria-labelledby="login-title">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--brand)]">HAIRHAEYO</p>
        <h1 className={`mt-3 ${typeScale.title}`} id="login-title">원장 로그인</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">헤어해요 운영 화면은 원장 계정만 사용할 수 있습니다.</p>

        <form action={loginOwner} className="mt-7 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="password">비밀번호</label>
            <input aria-describedby={invalid ? "login-error" : undefined} aria-invalid={invalid || undefined} autoComplete="current-password" className={`h-12 w-full rounded-[var(--radius-card)] border border-[var(--border)] px-4 ${focusRing}`} id="password" name="password" required type="password" />
          </div>
          {invalid && <p className="rounded-[var(--radius-control)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]" id="login-error" role="alert">비밀번호를 확인해 주세요.</p>}
          <button className={`h-12 w-full rounded-[var(--radius-card)] bg-[var(--brand)] font-medium text-white ${focusRing}`} type="submit">로그인</button>
        </form>

        {demoMode && <p className="mt-6 rounded-[var(--radius-card)] bg-[var(--brand-soft)] p-3 text-xs leading-5 text-[var(--brand)]">로컬 데모 원장 비밀번호: <strong>{DEMO_OWNER_PASSWORD}</strong></p>}
      </section>
    </main>
  );
}
