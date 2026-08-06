import { describe, expect, it } from "vitest";

import { activeNavigationItem, closeHref, matchNavigationItem, navigationItems } from "./navigation";

describe("matchNavigationItem", () => {
  it("prefers the exact path over a shorter prefix", () => {
    expect(matchNavigationItem("/sales/transactions").title).toBe("거래 기록");
    expect(matchNavigationItem("/sales").title).toBe("매출·결제");
  });

  it("keeps the sidebar on the parent for child routes", () => {
    expect(activeNavigationItem("/sales/transactions").path).toBe("/sales");
    expect(activeNavigationItem("/sales").path).toBe("/sales");
  });

  it("matches on segment boundaries, not substrings", () => {
    // "/salesperson" must not resolve to "/sales".
    expect(matchNavigationItem("/salesperson").path).toBe("/");
    expect(matchNavigationItem("/").title).toBe("오늘");
  });

  it("exposes one entry per sidebar destination", () => {
    expect(navigationItems.filter((item) => !item.parentId).map((item) => item.path)).toEqual([
      "/", "/customers", "/bookings", "/sales", "/messages", "/operations", "/settings",
    ]);
  });
});

describe("closeHref", () => {
  it("drops only the modal keys and keeps every other parameter", () => {
    expect(closeHref("/customers", new URLSearchParams("mode=phone&query=010&customer=c-12&new=1"), "new", "waiting"))
      .toBe("/customers?mode=phone&query=010&customer=c-12");
  });

  it("keeps booking edit and notice state when the create dialog closes", () => {
    expect(closeHref("/bookings", new URLSearchParams("date=2026-08-06&view=day&edit=b-1&notice=saved&new=1"), "new"))
      .toBe("/bookings?date=2026-08-06&view=day&edit=b-1&notice=saved");
  });

  it("returns a bare pathname when nothing is left", () => {
    expect(closeHref("/customers", new URLSearchParams("new=1"), "new")).toBe("/customers");
  });
});
