import Link from "next/link";

import { saveCatalogItem } from "../../app/operation-actions";
import { control, rowLink } from "../button";
import type {
  JsonObject,
  JsonValue,
  SalonRecord,
} from "../../lib/salon-domain";
import { SubmitButton } from "../submit-button";
import { card } from "../surface";
import { typeScale } from "../type";

/**
 * `/operations` 의 `시술 설정` 탭이 그대로 옮겨온 자리다 (설계 §5.2).
 * 쓰는 곳이 설정이라 설정 화면이 집이다 — 지출만 원장을 쓰므로 `/sales` 에 남았다.
 *
 * 같이 왔던 `메모·상태값`(두피 상태·모발 특징·선택 메모·사은품·간편 메모)은 지웠다.
 * `savePresetRecord`(`lib/operations.ts:55`)는 그대로 있지만 이 다섯 키를 **읽는 화면이 없었다** —
 * 결제·고객 어느 쪽도 참조하지 않아 저장만 되고 아무 데도 쓰이지 않는 값이었다.
 */
const input = `${control} mt-1 w-full`;
const won = (amount: number) => `₩${amount.toLocaleString("ko-KR")}`;
const value = (record: SalonRecord<JsonValue>) =>
  record.value &&
  typeof record.value === "object" &&
  !Array.isArray(record.value)
    ? (record.value as JsonObject)
    : {};
const string = (source: JsonObject, key: string) =>
  typeof source[key] === "string" ? source[key] : "";
const number = (source: JsonObject, key: string) =>
  typeof source[key] === "number" ? source[key] : 0;

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-[var(--muted)]">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ReturnTo({ value }: { value: string }) {
  return <input name="returnTo" type="hidden" value={value} />;
}

export function PriceList({
  catalog,
  editHref,
}: {
  catalog: readonly SalonRecord<JsonValue>[];
  editHref?: (id: string) => string;
}) {
  const services = catalog.filter((item) =>
    ["service-major", "service-detail"].includes(string(value(item), "type")),
  );
  return (
    <section aria-label="서비스 가격표" className={card}>
      <h2 className={typeScale.section}>서비스 가격표</h2>
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">서비스 가격표</caption>
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
            <th className="p-2" scope="col">
              대분류
            </th>
            <th className="p-2" scope="col">
              시술
            </th>
            <th className="p-2 text-right" scope="col">
              가격
            </th>
            {editHref && (
              <th className="p-2" scope="col">
                처리
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {services.map((item) => (
            <tr
              className="border-b border-[var(--border)] last:border-0"
              key={item.id}
            >
              <td className="p-2">
                {string(value(item), "category") ||
                  (string(value(item), "type") === "service-major"
                    ? string(value(item), "name")
                    : "-")}
              </td>
              <td className="p-2">
                {string(value(item), "type") === "service-major"
                  ? "대분류"
                  : string(value(item), "name")}
              </td>
              <td className="p-2 text-right font-medium tabular-nums">
                {won(number(value(item), "priceWon"))}
              </td>
              {editHref && (
                <td className="p-2">
                  <Link
                    className={rowLink}
                    data-catalog-edit={item.id}
                    href={editHref(item.id)}
                  >
                    수정
                  </Link>
                </td>
              )}
            </tr>
          ))}
          {services.length === 0 && (
            <tr>
              <td
                className="py-8 text-center text-[var(--muted)]"
                colSpan={editHref ? 4 : 3}
              >
                등록된 시술 가격이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function Services({
  catalog,
  editCatalogId,
  requestKey,
}: {
  catalog: readonly SalonRecord<JsonValue>[];
  editCatalogId?: string;
  requestKey: string;
}) {
  const editing = catalog.find((item) => item.id === editCatalogId);
  const current = editing ? value(editing) : {};
  return (
    <div className="grid grid-cols-2 gap-5">
      <form action={saveCatalogItem} className={card}>
        <ReturnTo value="/settings?section=services" />
        <input
          name="catalogId"
          type="hidden"
          value={editing?.id ?? `catalog-${requestKey}`}
        />
        <h2 className={typeScale.section}>
          {editing ? "시술 분류·가격 수정" : "시술 분류·가격 등록"}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="구분">
            <select
              className={input}
              defaultValue={string(current, "type") || "service-major"}
              name="type"
            >
              <option value="service-major">시술 대분류</option>
              <option value="service-detail">시술 상세</option>
            </select>
          </Field>
          <Field label="대분류">
            <input
              className={input}
              defaultValue={string(current, "category")}
              name="category"
              placeholder="커트"
            />
          </Field>
          <Field label="항목명">
            <input
              className={input}
              defaultValue={string(current, "name")}
              name="name"
              required
            />
          </Field>
          <Field label="가격">
            <input
              className={input}
              defaultValue={editing ? String(number(current, "priceWon")) : ""}
              min="0"
              name="priceWon"
              required
              type="number"
            />
          </Field>
        </div>
        <SubmitButton extra="mt-4" size="md">
          {editing ? "수정 저장" : "시술 저장"}
        </SubmitButton>
      </form>
      <PriceList
        catalog={catalog}
        editHref={(id) =>
          `/settings?section=services&edit=${encodeURIComponent(id)}`
        }
      />
    </div>
  );
}
