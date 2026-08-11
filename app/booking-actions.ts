"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cancelBookingRecord, changeBookingStatusRecord, saveBookingRecord, saveBookingSettingsRecord } from "../lib/booking";
import { createSalonStore } from "../lib/salon-store";

function withStore<T>(operation: (store: ReturnType<typeof createSalonStore>) => T) { const store = createSalonStore(); try { return operation(store); } finally { store.close(); } }
function revalidateBookings() { revalidatePath("/"); revalidatePath("/bookings"); revalidatePath("/customers"); }
function returnTo(formData: FormData) { const value = formData.get("returnTo"); return typeof value === "string" && /^\/bookings(?:\?|$)/.test(value) ? value : "/bookings"; }
function reportError(formData: FormData, error: unknown): never { const url = new URL(returnTo(formData), "http://localhost"); url.searchParams.delete("notice"); url.searchParams.set("error", error instanceof Error ? error.message : "예약 요청을 처리하지 못했습니다."); redirect(`${url.pathname}${url.search}`); }
// `bookings-page.tsx:81` 성공 배너는 이 한 줄이 없어 지금까지 도달 불가능한 죽은 코드였다.
function reportNotice(formData: FormData, notice: string): never { const url = new URL(returnTo(formData), "http://localhost"); url.searchParams.delete("error"); url.searchParams.set("notice", notice); redirect(`${url.pathname}${url.search}`); }
function mutate(formData: FormData, notice: string, operation: (store: ReturnType<typeof createSalonStore>) => unknown) { try { withStore(operation); } catch (error) { reportError(formData, error); } revalidateBookings(); reportNotice(formData, notice); }
/**
 * 실패를 **반환**한다. 성공만 이동한다.
 *
 * 리다이렉트는 화면을 처음부터 다시 그린다 — 등록 창이 통째로 닫히면서 입력한 예약이
 * 사라졌다. 원장은 시간 한 칸을 고치는 게 아니라 창을 다시 열고 처음부터 쳐야 했다.
 * 오류를 돌려주면 창이 그 자리에 남아 브라우저가 들고 있는 입력값이 그대로 살아남는다.
 * `reportNotice()` 의 성공 이동은 `redirect()` 라 예외로 빠져나간다 — `catch` 밖에 두어야 삼키지 않는다.
 */
export async function saveBooking(_state: string | undefined, formData: FormData) {
  try { withStore((store) => saveBookingRecord(store, formData)); }
  catch (error) { return error instanceof Error ? error.message : "예약 요청을 처리하지 못했습니다."; }
  revalidateBookings(); reportNotice(formData, "예약을 저장했습니다.");
}
export async function changeBookingStatus(formData: FormData) { mutate(formData, "예약 상태를 변경했습니다.", (store) => changeBookingStatusRecord(store, formData)); }
export async function cancelBooking(formData: FormData) { mutate(formData, "예약을 취소했습니다.", (store) => cancelBookingRecord(store, formData)); }
export async function saveBookingSettings(formData: FormData) { mutate(formData, "예약 설정을 저장했습니다.", (store) => saveBookingSettingsRecord(store, formData)); }
