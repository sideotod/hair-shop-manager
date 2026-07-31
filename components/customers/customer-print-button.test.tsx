import { describe, expect, it, vi } from "vitest";

import { triggerCustomerPrint } from "./customer-print-button";

describe("CustomerPrintButton", () => {
  it("invokes the browser print boundary", () => {
    const print = vi.fn();

    triggerCustomerPrint({ print } as Pick<Window, "print">);

    expect(print).toHaveBeenCalledOnce();
  });
});
