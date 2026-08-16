"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { markBookingCompleted } from "../lib/booking";
import { correctPaymentRecord, recordPayment, refundPaymentRecord } from "../lib/finance";
import { paymentReturnTo } from "../lib/navigation";
import { createSalonStore } from "../lib/salon-store";

// 환불은 `/sales/transactions` 에서, 결제는 `/customers`·`/bookings` 에서도 출발한다. 이 경로들을
// 허용하지 않으면 실패 메시지가 `/sales` 로 떨어져 사용자가 "눌렀는데 아무 일도 안 났다" 를 본다.
// 판정은 `lib/navigation.ts` 한 곳에 있다 — 라우트가 폼에 심을 때와 여기가 갈리면 안 된다.
function returnTo(formData: FormData) { return paymentReturnTo(formData.get("returnTo"), "/sales?pay=1"); }
function back(formData: FormData, key: "error" | "notice", message: string, extra: Readonly<Record<string, string>> = {}): never {
  const url = new URL(returnTo(formData), "http://localhost");
  url.searchParams.delete(key === "notice" ? "error" : "notice");
  url.searchParams.set(key, message);
  for (const [name, value] of Object.entries(extra)) url.searchParams.set(name, value);
  redirect(`${url.pathname}${url.search}`);
}
function mutate(formData: FormData, notice: string, operation: (store: ReturnType<typeof createSalonStore>) => unknown) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { back(formData, "error", error instanceof Error ? error.message : "결제를 처리하지 못했습니다."); }
  revalidatePath("/"); revalidatePath("/sales"); revalidatePath("/sales/transactions"); revalidatePath("/customers");
  back(formData, "notice", notice);
}
/**
 * 실패를 **반환**한다. 성공만 이동한다.
 *
 * 리다이렉트는 폼을 처음부터 다시 그린다 — 결제 33칸이 통째로 비워지고 열어둔 분할 결제도
 * 도로 접혔다. 사용자는 틀린 한 칸을 고치는 게 아니라 처음부터 다시 쳐야 했다.
 * 오류를 돌려주면 화면이 그 자리에 남아 브라우저가 들고 있는 입력값이 그대로 살아남는다.
 * `back()` 의 성공 이동은 `redirect()` 라 예외로 빠져나간다 — `catch` 밖에 두어야 삼키지 않는다.
 */
function attempt(formData: FormData, notice: string | (() => string), operation: (store: ReturnType<typeof createSalonStore>) => unknown, extra?: () => Readonly<Record<string, string>>) {
  try { const store = createSalonStore(); try { operation(store); } finally { store.close(); } }
  catch (error) { return error instanceof Error ? error.message : "결제를 처리하지 못했습니다."; }
  revalidatePath("/"); revalidatePath("/sales"); revalidatePath("/sales/transactions"); revalidatePath("/customers"); revalidatePath("/bookings");
  back(formData, "notice", typeof notice === "string" ? notice : notice(), extra?.());
}
/**
 * 예약에서 출발한 결제는 저장과 동시에 그 예약을 완료로 넘긴다(설계 §4.4).
 *
 * `markBookingCompleted` 은 반드시 **삼켜야** 한다. 살아남아야 하는 것은 원장 행이고,
 * 예약 상태는 그 뒤에 붙는 장부 정리다. 예약이 사라졌거나 이미 취소됐다는 이유로 결제 저장이
 * 통째로 실패하면 사용자는 돈을 받고도 기록을 남기지 못한다.
 * 안내 문구는 실제로 바뀐 경우에만 달라진다 — 반환값이 `null` 이면 아무것도 안 바뀐 것이다(`lib/booking.ts:113`).
 * 예약 갱신은 `store.close()` 전에 끝나야 하므로 `operation` **안**에서 부른다.
 */
export async function savePayment(_state: string | undefined, formData: FormData) {
  let completed = false;
  let firstVisitPayment = "";
  return attempt(formData, () => completed ? "결제를 저장하고 예약을 완료 처리했습니다." : "결제를 저장했습니다.", (store) => {
    const saved = recordPayment(store, formData);
    if (!saved.customerId && typeof formData.get("nonMemberName") === "string" && String(formData.get("nonMemberName")).trim()) firstVisitPayment = saved.id;
    const bookingId = formData.get("bookingId");
    if (typeof bookingId === "string" && bookingId) try { completed = markBookingCompleted(store, bookingId) !== null; } catch { /* 예약 상태는 원장 정확성보다 뒤다 */ }
  }, () => firstVisitPayment ? { firstVisitPayment } : {} as Record<string, string>);
}
export async function correctPayment(_state: string | undefined, formData: FormData) { return attempt(formData, "정정을 저장했습니다.", (store) => correctPaymentRecord(store, formData)); }
export async function refundPayment(formData: FormData) { mutate(formData, "환불을 처리했습니다.", (store) => refundPaymentRecord(store, formData)); }
