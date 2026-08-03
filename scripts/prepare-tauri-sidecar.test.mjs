import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { prepareSidecar } from "./prepare-tauri-sidecar.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("prepareSidecar", () => {
  it("assembles standalone assets and the target-triple Node executable", () => {
    const root = mkdtempSync(join(tmpdir(), "hairhaeyo-sidecar-"));
    roots.push(root);
    mkdirSync(join(root, ".next", "standalone"), { recursive: true });
    mkdirSync(join(root, ".next", "standalone", ".data"), { recursive: true });
    mkdirSync(join(root, ".next", "static"), { recursive: true });
    mkdirSync(join(root, "public"), { recursive: true });
    writeFileSync(join(root, ".next", "standalone", ".data", "hairhaeyo.sqlite"), "private salon data");
    writeFileSync(join(root, ".next", "static", "asset.txt"), "static");
    writeFileSync(join(root, "public", "public.txt"), "public");
    const nodeExecutable = join(root, "node.exe");
    writeFileSync(nodeExecutable, "node");

    prepareSidecar({ root, nodeExecutable, targetTriple: "x86_64-pc-windows-msvc" });

    expect(readFileSync(join(root, ".next", "standalone", ".next", "static", "asset.txt"), "utf8")).toBe("static");
    expect(readFileSync(join(root, ".next", "standalone", "public", "public.txt"), "utf8")).toBe("public");
    expect(() => readFileSync(join(root, ".next", "standalone", ".data", "hairhaeyo.sqlite"), "utf8")).toThrow();
    expect(readFileSync(join(root, "src-tauri", "binaries", "node-x86_64-pc-windows-msvc.exe"), "utf8")).toBe("node");
  });

  it("allows projects without a public directory", () => {
    const root = mkdtempSync(join(tmpdir(), "hairhaeyo-sidecar-"));
    roots.push(root);
    mkdirSync(join(root, ".next", "standalone"), { recursive: true });
    mkdirSync(join(root, ".next", "static"), { recursive: true });
    const nodeExecutable = join(root, "node.exe");
    writeFileSync(nodeExecutable, "node");

    expect(() => prepareSidecar({ root, nodeExecutable, targetTriple: "x86_64-pc-windows-msvc" })).not.toThrow();
  });
});
