import { describe, expect, it, vi } from "vitest";

const { connection, redirect } = vi.hoisted(() => ({
  connection: vi.fn(),
  redirect: vi.fn((url: string): never => { throw new Error(`redirect:${url}`); }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/server", () => ({ connection }));

import Page from "./page";

describe("messages route", () => {
  it("hides the dormant messaging surface even on a direct URL", async () => {
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/");
    expect(redirect).toHaveBeenCalledWith("/");
    expect(connection).not.toHaveBeenCalled();
  });
});
