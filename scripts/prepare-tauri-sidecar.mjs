import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function rustTargetTriple() {
  if (process.env.TAURI_ENV_TARGET_TRIPLE) return process.env.TAURI_ENV_TARGET_TRIPLE;
  const rustc = process.env.RUSTC || join(homedir(), ".cargo", "bin", "rustc.exe");
  const output = execFileSync(rustc, ["-vV"], { encoding: "utf8" });
  const host = output.match(/^host:\s*(.+)$/m)?.[1];
  if (!host) throw new Error("Unable to determine the Rust target triple");
  return host;
}

export function prepareSidecar({ root, nodeExecutable, targetTriple }) {
  const standalone = join(root, ".next", "standalone");
  rmSync(join(standalone, ".data"), { recursive: true, force: true });
  for (const [source, target] of [
    [join(root, ".next", "static"), join(standalone, ".next", "static")],
    [join(root, "public"), join(standalone, "public")],
  ]) {
    if (!existsSync(source)) continue;
    rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
  }
  const binaries = join(root, "src-tauri", "binaries");
  mkdirSync(binaries, { recursive: true });
  cpSync(nodeExecutable, join(binaries, `node-${targetTriple}.exe`));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(currentFile).href) {
  prepareSidecar({
    root: resolve(dirname(currentFile), ".."),
    nodeExecutable: process.execPath,
    targetTriple: rustTargetTriple(),
  });
}
