// 원본 DB를 복제한 뒤 scripts/seed-analytics-dummy.sql 을 **복제본에만** 적용한다.
// 더미 데이터는 커밋하지 않는다 — 이 스크립트만 공유하고, 각자 별도 파일을 만든다.
//
//   node scripts/seed-analytics-dummy.mjs .data/hairhaeyo.sqlite .data/demo/sales-audit.sqlite
import { DatabaseSync } from "node:sqlite";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [sourceArgument, demoArgument] = process.argv.slice(2);
if (!sourceArgument || !demoArgument) throw new Error("원본 DB와 더미 DB 경로를 모두 지정하세요.");
const source = resolve(sourceArgument);
const demo = resolve(demoArgument);
if (source === demo) throw new Error("원본 DB와 더미 DB 경로는 달라야 합니다.");
mkdirSync(dirname(demo), { recursive: true });
copyFileSync(source, demo);

const db = new DatabaseSync(demo);
db.exec(readFileSync(new URL("./seed-analytics-dummy.sql", import.meta.url), "utf8"));

const rows = db.prepare(`
  SELECT json_extract(details, '$.serviceMajor') AS service, COUNT(*) AS count, SUM(gross_won) AS gross
  FROM ledger WHERE kind != 'expense' GROUP BY service ORDER BY gross DESC
`).all();
console.table(rows);
db.close();
