import { spawn } from "node:child_process";
import { join } from "node:path";

export type WindowsCredential = { username: string; secret: string };
export type WindowsCredentialProcessRunner = (request: {
  command: string;
  args: string[];
  input: string;
}) => Promise<{ stdout: string; exitCode: number }>;

type HelperRequest =
  | { action: "write"; target: string; username: string; secret: string }
  | { action: "read"; target: string }
  | { action: "delete"; target: string };

export const resolveWindowsCredentialHelperPath = (cwd = process.cwd()) => join(cwd, "scripts", "windows-credential.ps1");

const runPowerShell: WindowsCredentialProcessRunner = ({ command, args, input }) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout += chunk; });
  child.once("error", reject);
  child.once("close", (exitCode) => resolve({ stdout, exitCode: exitCode ?? 1 }));
  child.stdin.end(input);
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const assertText = (value: string, name: string) => {
  if (!value) throw new Error(`Windows Credential Manager ${name} is required`);
};

async function invoke(request: HelperRequest, runner: WindowsCredentialProcessRunner) {
  let response: { stdout: string; exitCode: number };
  try {
    response = await runner({
      command: "powershell.exe",
      args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", resolveWindowsCredentialHelperPath()],
      input: JSON.stringify(request),
    });
  } catch {
    throw new Error("Windows Credential Manager helper failed");
  }
  if (response.exitCode !== 0) throw new Error("Windows Credential Manager helper failed");

  try {
    const value: unknown = JSON.parse(response.stdout);
    if (!isRecord(value) || value.ok !== true) throw new Error();
    return value;
  } catch {
    throw new Error("Windows Credential Manager helper returned invalid output");
  }
}

export async function writeWindowsCredential(target: string, username: string, secret: string, runner = runPowerShell): Promise<void> {
  assertText(target, "target");
  assertText(username, "username");
  assertText(secret, "secret");
  await invoke({ action: "write", target, username, secret }, runner);
}

export async function readWindowsCredential(target: string, runner = runPowerShell): Promise<WindowsCredential | null> {
  assertText(target, "target");
  const value = await invoke({ action: "read", target }, runner);
  if (value.found === false) return null;
  if (typeof value.username !== "string" || typeof value.secret !== "string") throw new Error("Windows Credential Manager helper returned invalid output");
  return { username: value.username, secret: value.secret };
}

export async function deleteWindowsCredential(target: string, runner = runPowerShell): Promise<void> {
  assertText(target, "target");
  await invoke({ action: "delete", target }, runner);
}
