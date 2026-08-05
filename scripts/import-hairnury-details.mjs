import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const path = ".data/hairhaeyo.sqlite";
const source = JSON.parse(readFileSync(".hairnury-details.json", "utf8"));
const db = new DatabaseSync(path);
const money = (s) => Number(String(s ?? "0").replace(/[^0-9-]/g, "")) || 0;
const dateIso = (s) => { const m = String(s ?? "").match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z` : new Date().toISOString(); };
const member = (href) => String(href ?? "").match(/MemberCode=([^&]+)/)?.[1] ?? "unknown";
const now = new Date().toISOString();
db.exec("BEGIN IMMEDIATE");
try {
  db.exec("DELETE FROM audit_events WHERE action = 'import-ledger'; DELETE FROM ledger;");
  const ins = db.prepare("INSERT INTO ledger(id,request_key,kind,occurred_at,correction_of,customer_id,gross_won,amount_won,discount_won,vat_won,fee_won,expense_won,incentive_won,points_won,coupon_won,profit_won,details) VALUES(?,?, 'payment', ?,NULL,?,?,?,0,?,?,0,?,?,0,?,?)");
  const audit = db.prepare("INSERT INTO audit_events(id,occurred_at,actor,action,kind,record_id,payload) VALUES(?,?,?,?,?,?,?)");
  let entries = 0;
  let fallback = 0;
  for (const item of source) {
    const code = member(item.href);
    const customerId = `hairnury-${code}`;
    const rows = Array.isArray(item.rows) ? item.rows : [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const amount = money(r[2]);
      if (!amount && !money(r[3]) && !money(r[4]) && !money(r[5]) && !money(r[6]) && !money(r[7])) continue;
      const occurredAt = dateIso(r[0]);
      const points = money(r[3]);
      const fee = money(r[5]);
      const incentive = money(r[6]);
      const profit = money(r[7]);
      const id = `hairnury-detail-${code}-${i}`;
      const details = { source: "hairnury", sourceMemberCode: code, customerName: item.name, operator: r[1] || "", serviceRaw: "", serviceMajor: "미분류", gender: item.cells?.[4] === "♂" ? "male" : item.cells?.[4] === "♀" ? "female" : "other", visitType: "repeat", vatMode: "unknown", paymentMethods: { other: amount }, pointsEarnedWon: points, sourceRow: r };
      ins.run(id, `hairnury-detail:${code}:${i}`, occurredAt, customerId, amount, amount, money(r[4]), fee, incentive, points, profit, JSON.stringify(details));
      audit.run(randomUUID(), occurredAt, "hairnury-import", "import-ledger", "ledger", id, JSON.stringify({ source: "hairnury", sourceMemberCode: code, sourceRow: r }));
      entries++;
    }
    if (rows.length === 0 && money(item.cells?.[7]) > 0) {
      const amount = money(item.cells[7]);
      const id = `hairnury-fallback-${code}`;
      const occurredAt = dateIso(item.cells?.[1]);
      const details = { source: "hairnury", sourceMemberCode: code, customerName: item.name, operator: item.cells?.[3] || "", serviceMajor: "미분류", paymentMethods: { other: amount }, sourceNote: "상세 시술 행 없음; 목록 누적 매출 보존" };
      ins.run(id, `hairnury-fallback:${code}`, occurredAt, customerId, amount, amount, 0, 0, 0, 0, amount, JSON.stringify(details));
      audit.run(randomUUID(), occurredAt, "hairnury-import", "import-ledger", "ledger", id, JSON.stringify({ source: "hairnury", sourceMemberCode: code, fallback: true }));
      fallback++;
    }
  }
  const sumByCustomer = new Map();
  for (const row of db.prepare("SELECT customer_id, COALESCE(SUM(amount_won),0) AS total FROM ledger GROUP BY customer_id").all()) sumByCustomer.set(row.customer_id, Number(row.total) || 0);
  for (const item of source) {
    const code = member(item.href);
    const customerId = `hairnury-${code}`;
    const expected = money(item.cells?.[7]);
    const actual = sumByCustomer.get(customerId) || 0;
    const gap = expected - actual;
    if (gap === 0) continue;
    const id = `hairnury-reconciliation-${code}`;
    const occurredAt = dateIso(item.cells?.[1]);
    const details = { source: "hairnury", sourceMemberCode: code, customerName: item.name, serviceMajor: "미분류", paymentMethods: { other: gap }, sourceNote: "고객 목록 누적 매출과 상세 시술 행의 차액 보정(상품/이전 페이지 등 미분류 항목)" };
    ins.run(id, `hairnury-reconciliation:${code}`, occurredAt, customerId, gap, gap, 0, 0, 0, 0, gap, JSON.stringify(details));
    audit.run(randomUUID(), occurredAt, "hairnury-import", "import-ledger", "ledger", id, JSON.stringify({ source: "hairnury", sourceMemberCode: code, reconciliationWon: gap }));
  }
  const customerRows = db.prepare("SELECT id, payload FROM records WHERE kind = 'customers'").all();
  const latestByCustomer = db.prepare("SELECT customer_id, MAX(occurred_at) AS latest FROM ledger WHERE customer_id IS NOT NULL GROUP BY customer_id").all();
  const latestMap = new Map(latestByCustomer.map((row) => [row.customer_id, row.latest]));
  const updateCustomer = db.prepare("UPDATE records SET payload = ?, updated_at = ? WHERE kind = 'customers' AND id = ?");
  for (const row of customerRows) {
    const latest = latestMap.get(row.id);
    if (!latest) continue;
    const value = JSON.parse(row.payload);
    value.lastServiceAt = latest;
    updateCustomer.run(JSON.stringify(value), now, row.id);
  }
  db.exec("COMMIT");
  console.log(JSON.stringify({ customers: source.length, entries, fallback }));
} catch (e) { db.exec("ROLLBACK"); throw e; }
db.close();
