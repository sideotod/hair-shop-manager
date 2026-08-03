import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalToken = process.env.HAIRHAEYO_HEALTH_TOKEN;

afterEach(() => {
  if (originalToken === undefined) delete process.env.HAIRHAEYO_HEALTH_TOKEN;
  else process.env.HAIRHAEYO_HEALTH_TOKEN = originalToken;
});

describe("Tauri sidecar health route", () => {
  it("accepts only the per-run health token", async () => {
    process.env.HAIRHAEYO_HEALTH_TOKEN = "task9-health-token";

    expect((await GET(new Request("http://127.0.0.1/api/health"))).status).toBe(403);
    expect((await GET(new Request("http://127.0.0.1/api/health", { headers: { "x-hairhaeyo-health": "wrong" } }))).status).toBe(403);
    expect((await GET(new Request("http://127.0.0.1/api/health", { headers: { "x-hairhaeyo-health": "task9-health-token" } }))).status).toBe(204);
  });
});
