/**
 * 저장된 행위자 이름 `원장` 을 `사용자` 로 바꾼다.
 *
 * 코드는 `lib/settings.ts:8` 등에서 `사용자` 를 쓰는데 DB 에는 옛 이름이 남아 있다.
 * 두 값이 섞이면 설정 화면의 변경 이력(`components/settings/settings-page.tsx:88`)에
 * 같은 사람이 두 이름으로 나오고, `operator` 로 묶는 집계가 한 사람을 둘로 센다.
 *
 * 회계 원장(元帳)을 뜻하는 `원장` 은 건드리지 않는다 — 여기서 바꾸는 것은
 * `audit_events.actor` 와 JSON 의 `operator` 키, 즉 사람을 가리키는 값뿐이다.
 * `payload` 안 감사 스냅샷은 그때 찍힌 사진이라 그대로 둔다.
 *
 * 옛 DB 를 다시 들여올 때마다 돌린다 — 여러 번 실행해도 안전하고, 두 번째부터는 0행이다.
 *
 * 실행: node scripts/rename-actor-to-user.mjs [db경로]
 */
import { DatabaseSync } from "node:sqlite";

const OLD = "원장";
const NEW = "사용자";

const path = process.argv[2] ?? ".data/hairhaeyo.sqlite";
const db = new DatabaseSync(path);

const count = (sql) => db.prepare(sql).get().n;
const auditSql = `SELECT COUNT(*) AS n FROM audit_events WHERE actor = '${OLD}'`;
const ledgerSql = `SELECT COUNT(*) AS n FROM ledger WHERE json_extract(details, '$.operator') = '${OLD}'`;
const recordSql = `SELECT COUNT(*) AS n FROM records WHERE json_extract(payload, '$.operator') = '${OLD}'`;
// 예약의 상태 이력은 배열 안 `actor` 다 (`lib/booking.ts:105`). 한 줄만 옛 이름이어도 그 행을 고쳐야 한다.
const historyWhere = `EXISTS (SELECT 1 FROM json_each(records.payload, '$.statusHistory') WHERE json_extract(value, '$.actor') = '${OLD}')`;
const historySql = `SELECT COUNT(*) AS n FROM records WHERE json_type(payload, '$.statusHistory') = 'array' AND ${historyWhere}`;

const before = { audit: count(auditSql), ledger: count(ledgerSql), record: count(recordSql), history: count(historySql) };

// `updated_at` 을 그대로 다시 쓴다. 이름 통일은 사용자가 고친 사건이 아니다 —
// 수정 시각이 오늘로 밀리면 "최근 수정 고객" 이 전량이 된다 (`prune-customer-fields.mjs:28` 과 같은 이유).
db.exec(`UPDATE audit_events SET actor = '${NEW}' WHERE actor = '${OLD}'`);
db.exec(`UPDATE ledger SET details = json_set(details, '$.operator', '${NEW}') WHERE json_extract(details, '$.operator') = '${OLD}'`);
db.exec(`UPDATE records SET payload = json_set(payload, '$.operator', '${NEW}'), updated_at = updated_at WHERE json_extract(payload, '$.operator') = '${OLD}'`);
// SQLite 에는 배열 원소를 한 번에 고치는 문법이 없다. 이력을 통째로 다시 만들어 넣는다 — 다른 이름의 줄은 그대로 옮긴다.
db.exec(`UPDATE records SET payload = json_set(payload, '$.statusHistory', (SELECT json_group_array(CASE WHEN json_extract(value, '$.actor') = '${OLD}' THEN json_set(value, '$.actor', '${NEW}') ELSE value END) FROM json_each(records.payload, '$.statusHistory'))), updated_at = updated_at WHERE json_type(payload, '$.statusHistory') = 'array' AND ${historyWhere}`);

const after = { audit: count(auditSql), ledger: count(ledgerSql), record: count(recordSql), history: count(historySql) };
db.close();

console.log(`감사 ${before.audit}행 · 원장 ${before.ledger}행 · 레코드 ${before.record}행 · 예약 이력 ${before.history}행 을 "${OLD}" → "${NEW}" 로 바꿨습니다.`);
const leftover = after.audit + after.ledger + after.record + after.history;
if (leftover > 0) {
  console.error(`남은 "${OLD}" 행 ${leftover}건 — 감사 ${after.audit} · 원장 ${after.ledger} · 레코드 ${after.record} · 예약 이력 ${after.history}`);
  process.exitCode = 1;
}
