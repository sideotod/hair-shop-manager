import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

import {
  deleteWindowsCredential,
  readWindowsCredential,
  resolveWindowsCredentialHelperPath,
  writeWindowsCredential,
  type WindowsCredentialProcessRunner,
} from "./windows-credential";

const secret = "naver-app-password-1234";

const runner = (result: { stdout: string; exitCode: number }) => {
  const run = vi.fn<WindowsCredentialProcessRunner>().mockResolvedValue(result);
  return run;
};

describe("Windows Credential Manager boundary", () => {
  it("resolves helper below packaged Tauri server directory", () => {
    expect(resolveWindowsCredentialHelperPath("C:\\Hairhaeyo\\resources\\server")).toBe("C:\\Hairhaeyo\\resources\\server\\scripts\\windows-credential.ps1");
  });

  it("writes target, username, and secret through helper stdin only", async () => {
    const run = runner({ stdout: '{"ok":true}', exitCode: 0 });

    await writeWindowsCredential("Hairhaeyo:NaverBookingMail", "owner@naver.com", secret, run);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      command: "powershell.exe",
      input: JSON.stringify({ action: "write", target: "Hairhaeyo:NaverBookingMail", username: "owner@naver.com", secret }),
    }));
    expect(run.mock.calls[0][0].args.join(" ")).not.toContain(secret);
  });

  it("returns explicit read credential from helper JSON", async () => {
    const run = runner({ stdout: JSON.stringify({ ok: true, found: true, username: "owner@naver.com", secret }), exitCode: 0 });

    await expect(readWindowsCredential("Hairhaeyo:NaverBookingMail", run)).resolves.toEqual({ username: "owner@naver.com", secret });
  });

  it("returns null when helper does not find target", async () => {
    const run = runner({ stdout: '{"ok":true,"found":false}', exitCode: 0 });

    await expect(readWindowsCredential("Hairhaeyo:NaverBookingMail", run)).resolves.toBeNull();
  });

  it("runs helper for a missing disposable target", async () => {
    await expect(readWindowsCredential(`Hairhaeyo:Task10Missing-${randomUUID()}`)).resolves.toBeNull();
  }, 15_000);

  it("deletes target through helper JSON", async () => {
    const run = runner({ stdout: '{"ok":true}', exitCode: 0 });

    await deleteWindowsCredential("Hairhaeyo:NaverBookingMail", run);

    expect(run).toHaveBeenCalledWith(expect.objectContaining({
      input: JSON.stringify({ action: "delete", target: "Hairhaeyo:NaverBookingMail" }),
    }));
  });

  it("rejects malformed helper output without exposing secrets", async () => {
    const run = runner({ stdout: secret, exitCode: 0 });

    await expect(writeWindowsCredential("Hairhaeyo:NaverBookingMail", "owner@naver.com", secret, run)).rejects.toThrow("Windows Credential Manager helper returned invalid output");
    await writeWindowsCredential("Hairhaeyo:NaverBookingMail", "owner@naver.com", secret, run).catch((error: Error) => expect(error.message).not.toContain(secret));
  });

  it("rejects helper failure without exposing secrets from output", async () => {
    const run = runner({ stdout: JSON.stringify({ ok: false, error: secret }), exitCode: 1 });

    await expect(deleteWindowsCredential("Hairhaeyo:NaverBookingMail", run)).rejects.toThrow("Windows Credential Manager helper failed");
    await deleteWindowsCredential("Hairhaeyo:NaverBookingMail", run).catch((error: Error) => expect(error.message).not.toContain(secret));
  });
});
