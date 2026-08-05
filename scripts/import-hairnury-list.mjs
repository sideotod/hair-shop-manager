import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const root = process.cwd();
const input = JSON.parse(readFileSync(join(root, ".hairnury-customers.json"), "utf8"));
const dbPath = process.env.HAIRHAEYO_DB_PATH || join(root, ".data", "hairhaeyo.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,archived_at TEXT,PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS ledger (id TEXT PRIMARY KEY,request_key TEXT NOT NULL UNIQUE,kind TEXT NOT NULL,occurred_at TEXT NOT NULL,correction_of TEXT,customer_id TEXT,gross_won INTEGER NOT NULL DEFAULT 0,amount_won INTEGER NOT NULL,discount_won INTEGER NOT NULL DEFAULT 0,vat_won INTEGER NOT NULL,fee_won INTEGER NOT NULL,expense_won INTEGER NOT NULL DEFAULT 0,incentive_won INTEGER NOT NULL,points_won INTEGER NOT NULL,coupon_won INTEGER NOT NULL,profit_won INTEGER NOT NULL,details TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY,occurred_at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,kind TEXT,record_id TEXT,payload TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_one_reversal_per_original ON ledger(correction_of) WHERE kind IN ('refund','correction');
`);
db.exec("DELETE FROM audit_events; DELETE FROM ledger; DELETE FROM records; DELETE FROM settings;");
const now = new Date().toISOString();
const recordStmt = db.prepare("INSERT INTO records(kind,id,payload,created_at,updated_at,archived_at) VALUES(?,?,?,?,?,NULL)");
const ledgerStmt = db.prepare("INSERT INTO ledger(id,request_key,kind,occurred_at,correction_of,customer_id,gross_won,amount_won,discount_won,vat_won,fee_won,expense_won,incentive_won,points_won,coupon_won,profit_won,details) VALUES(?,?,?, ?,NULL,?,?,?,0,0,0,0,0,0,0,?,?)");
const auditStmt = db.prepare("INSERT INTO audit_events(id,occurred_at,actor,action,kind,record_id,payload) VALUES(?,?,?,?,?,?,?)");
const money = (s) => Number(String(s ?? "0").replace(/[^0-9-]/g, "")) || 0;
const isoDate = (s) => { const m = String(s ?? "").match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z` : now; };
const actor = "hairnury-import";
db.exec("BEGIN IMMEDIATE");
try {
  for (const row of input) {
    const c = row.cells ?? [];
    const memberCode = String(row.href ?? "").match(/MemberCode=([^&]+)/)?.[1] ?? randomUUID();
    const id = `hairnury-${memberCode}`;
    const joinedAt = isoDate(c[1]);
    const phone = String(c[5] ?? "").replace(/\s+/g, " ").trim();
    const value = { source: "hairnury", sourceMemberCode: memberCode, name: row.name || c[2] || "미상", gender: c[4] === "♂" ? "male" : c[4] === "♀" ? "female" : "other", phone, telephone: "", phoneAbsent: phone.includes("[없음]"), smsOptIn: true, birthday: "", birthdayCalendar: "solar", points: money(c[8]), nickname: "", pointCard: "", familyNumber: "", memo: c[9] || "", group: "", motive: "", operator: c[3] || "", grade: "", firstMetAt: joinedAt, joinedAt, visitType: Number(String(c[6] ?? "0").replace(/[^0-9]/g, "")) > 1 ? "repeat" : "first", sourceSummary: { visitCount: c[6] || "", totalSalesWon: money(c[7]), pointsBalance: money(c[8]) } };
    const payload = JSON.stringify(value);
    recordStmt.run("customers", id, payload, joinedAt, now);
    auditStmt.run(randomUUID(), now, actor, "import-record", "customers", id, JSON.stringify({ source: "hairnury", sourceMemberCode: memberCode }));
    const amount = money(c[7]);
    if (amount !== 0) {
      const occurredAt = joinedAt;
      const lid = `hairnury-sale-${memberCode}`;
      const details = { source: "hairnury", sourceMemberCode: memberCode, customerName: value.name, operator: value.operator, gender: value.gender, visitType: value.visitType, serviceMajor: "미분류", generalNote: "Hairnury 고객 목록 누적 매출 이관(개별 시술 내역은 상세 수집 대상)", sourceVisitCount: c[6] || "", sourcePointsBalance: money(c[8]), paymentMethods: { other: amount } };
      ledgerStmt.run(lid, `hairnury-sale:${memberCode}`, "payment", occurredAt, id, amount, amount, amount, JSON.stringify(details));
      auditStmt.run(randomUUID(), occurredAt, actor, "import-ledger", "ledger", lid, JSON.stringify({ source: "hairnury", sourceMemberCode: memberCode, amountWon: amount }));
    }
  }
  const settings = { shopName: "헤어해요", ownerName: "", smsRemaining: 1026, source: "hairnury", importedAt: now, migrationNote: "고객 목록 기반 이관; 상세 시술 필드는 별도 보강 대상" };
  db.prepare("INSERT INTO settings(id,payload,updated_at) VALUES(1,?,?)").run(JSON.stringify(settings), now);
  auditStmt.run(randomUUID(), now, actor, "import-settings", "settings", "1", JSON.stringify(settings));
  db.exec("COMMIT");
} catch (e) { db.exec("ROLLBACK"); throw e; }
db.close();
console.log(JSON.stringify({ dbPath, customers: input.length, sales: input.filter(r => money(r.cells?.[7]) !== 0).length }));
