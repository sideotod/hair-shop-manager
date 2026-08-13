/**
 * 삭제한 고객 속성을 DB에서도 지운다.
 *
 * 화면과 코드에서 빠진 값이 `records.payload` 에 남아 있으면 858행 × 15키가 매 읽기에
 * 딸려 오고, 나중에 같은 이름으로 다른 뜻의 필드를 만들 때 조용히 되살아난다.
 * 스키마는 건드리지 않는다 — `payload` 는 JSON 열이라 `json_remove` 로 충분하다.
 *
 * 실행: node scripts/prune-customer-fields.mjs [db경로]
 * 되돌릴 수 없다. 먼저 파일을 복사해 둔다.
 */
import { DatabaseSync } from "node:sqlite";

// `pointDebtWon` 은 지우지 않는다 — `salon-store.ts` 가 포인트 행마다 다시 계산해 쓴다.
const REMOVED = [
  "grade", "group", "motive", "birthday", "birthdayCalendar",
  "telephone", "phoneAbsent", "pointCard", "familyNumber", "nickname",
  "address", "email", "lastServiceAt", "firstMetAt",
];

const path = process.argv[2] ?? ".data/hairhaeyo.sqlite";
const db = new DatabaseSync(path);

const before = db.prepare("SELECT COUNT(*) AS n FROM records WHERE kind = 'customers'").get();
const waiting = db.prepare("SELECT COUNT(*) AS n FROM records WHERE kind = 'waiting-customers'").get();
const archived = db.prepare("SELECT COUNT(*) AS n FROM records WHERE kind = 'customers' AND archived_at IS NOT NULL").get();

const removals = REMOVED.map((key) => `'$.${key}'`).join(", ");
// `updated_at` 을 그대로 다시 쓴다. 정리는 원장이 고친 사건이 아니라 형식 변경이다 —
// 수정 시각이 오늘로 밀리면 "최근 수정 고객" 이 858명이 된다.
db.exec(`UPDATE records SET payload = json_remove(payload, ${removals}), updated_at = updated_at WHERE kind = 'customers'`);
db.exec("DELETE FROM records WHERE kind = 'waiting-customers'");
// 보관 화면이 사라졌다. 보관된 고객은 어디에서도 되돌릴 수 없으므로 목록으로 되돌린다.
db.exec("UPDATE records SET archived_at = NULL WHERE kind = 'customers' AND archived_at IS NOT NULL");
db.exec("VACUUM");

const leftover = db.prepare(`SELECT COUNT(*) AS n FROM records WHERE kind = 'customers' AND (${REMOVED.map((key) => `json_extract(payload, '$.${key}') IS NOT NULL`).join(" OR ")})`).get();
db.close();

console.log(`고객 ${before.n}행 정리 · 대기 고객 ${waiting.n}행 삭제 · 보관 해제 ${archived.n}행 · 남은 옛 속성 ${leftover.n}행`);
if (leftover.n > 0) process.exitCode = 1;
