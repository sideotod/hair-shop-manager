// scripts/seed-analytics-dummy.sql 을 로컬 DB에 적용한다.
// 더미 데이터는 커밋하지 않는다 — 이 스크립트만 공유하고, 각자 한 번 돌린다.
//
//   node scripts/seed-analytics-dummy.mjs
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const db = new DatabaseSync(process.argv[2] ?? ".data/hairhaeyo.sqlite");
db.exec(readFileSync(new URL("./seed-analytics-dummy.sql", import.meta.url), "utf8"));

const rows = db.prepare(`
  SELECT json_extract(details, '$.serviceMajor') AS service, COUNT(*) AS count, SUM(gross_won) AS gross
  FROM ledger WHERE kind != 'expense' GROUP BY service ORDER BY gross DESC
`).all();
console.table(rows);
db.close();
