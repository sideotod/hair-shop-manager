import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const directory = mkdtempSync(join(tmpdir(), "hairhaeyo-analytics-dummy-"));
const source = join(directory, "source.sqlite");
const demo = join(directory, "demo.sqlite");

function serviceAt(path) {
  const db = new DatabaseSync(path);
  try {
    return db.prepare("SELECT json_extract(details, '$.serviceMajor') AS service FROM ledger WHERE kind != 'expense' LIMIT 1").get().service;
  } finally { db.close(); }
}

function createRawImportedSource(path) {
  const db = new DatabaseSync(path);
  try {
    db.exec("CREATE TABLE ledger (kind TEXT, occurred_at TEXT, gross_won INTEGER, amount_won INTEGER, details TEXT)");
    db.prepare("INSERT INTO ledger (kind, occurred_at, gross_won, amount_won, details) VALUES (?, ?, ?, ?, ?)")
      .run("payment", "2026-08-12T12:00:00.000Z", 362000, 362000, '{"serviceMajor":"미분류","paymentMethods":{"other":362000}}');
  } finally { db.close(); }
}

try {
  createRawImportedSource(source);
  assert.equal(serviceAt(source), "미분류");
  execFileSync(process.execPath, ["scripts/seed-analytics-dummy.mjs", source, demo], { stdio: "pipe" });
  assert.equal(serviceAt(source), "미분류");
  assert.notEqual(serviceAt(demo), "미분류");
  assert.throws(() => execFileSync(process.execPath, ["scripts/seed-analytics-dummy.mjs", source, source], { stdio: "pipe" }));
} finally { rmSync(directory, { force: true, recursive: true }); }
