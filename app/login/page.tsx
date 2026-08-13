import { loginOwner, setInitialOwnerPassword } from "../auth-actions";
import { focusRing } from "../../components/button";
import { surface } from "../../components/surface";
import { typeScale } from "../../components/type";
import { createSalonStore } from "../../lib/salon-store";
import { ownerPasswordHash } from "../../lib/settings";

const inputClass = `h-12 w-full rounded-[var(--radius-card)] border border-[var(--border)] px-4 ${focusRing}`;

function hasOwnerPassword() {
  const store = createSalonStore();
  try { return ownerPasswordHash(store.getSettings()) !== null; } finally { store.close(); }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  const configured = hasOwnerPassword();
  const invalid = configured && error === "1";
  const setupError = !configured && error ? decodeURIComponent(error) : "";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-8">
      <section className={`w-full max-w-md p-8 ${surface}`} aria-labelledby="login-title">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--brand)]">HAIRHAEYO</p>
        <h1 className={`mt-3 ${typeScale.title}`} id="login-title">{configured ? "사용자 로그인" : "사용자 비밀번호 설정"}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{configured ? "헤어해요 운영 화면은 사용자 계정만 사용할 수 있습니다." : "초기 비밀번호가 없습니다. 사용할 비밀번호를 지금 정해 주세요."}</p>

        {configured
          ? <form action={loginOwner} className="mt-7 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password">비밀번호</label>
                <input aria-describedby={invalid ? "login-error" : undefined} aria-invalid={invalid || undefined} autoComplete="current-password" className={inputClass} id="password" name="password" required type="password" />
              </div>
              {invalid && <p className="rounded-[var(--radius-control)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]" id="login-error" role="alert">비밀번호를 확인해 주세요.</p>}
              <button className={`h-12 w-full rounded-[var(--radius-card)] bg-[var(--brand)] font-medium text-white ${focusRing}`} type="submit">로그인</button>
            </form>
          : <form action={setInitialOwnerPassword} className="mt-7 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="newPassword">새 비밀번호</label>
                <input aria-describedby="password-rule" autoComplete="new-password" className={inputClass} id="newPassword" name="newPassword" required type="password" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="confirmPassword">새 비밀번호 확인</label>
                <input aria-describedby="password-rule" autoComplete="new-password" className={inputClass} id="confirmPassword" name="confirmPassword" required type="password" />
              </div>
              <p className="text-xs text-[var(--muted)]" id="password-rule">설정 화면에서 언제든 바꿀 수 있습니다.</p>
              {setupError && <p className="rounded-[var(--radius-control)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-[var(--danger)]" role="alert">{setupError}</p>}
              <button className={`h-12 w-full rounded-[var(--radius-card)] bg-[var(--brand)] font-medium text-white ${focusRing}`} type="submit">비밀번호 설정하고 시작</button>
            </form>}
      </section>
    </main>
  );
}
