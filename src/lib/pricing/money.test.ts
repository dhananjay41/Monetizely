import { describe, expect, it } from "vitest";
import { formatPercent, formatUSD, round2 } from "./money";

describe("round2", () => {
  it("rounds to two decimals half-up", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
    expect(round2(9.999)).toBe(10);
    expect(round2(100)).toBe(100);
  });
});

describe("formatUSD", () => {
  it("formats with a thousands separator and two decimals", () => {
    expect(formatUSD(12750)).toBe("$12,750.00");
    expect(formatUSD(0)).toBe("$0.00");
    expect(formatUSD(-1515)).toBe("-$1,515.00");
  });
});

describe("formatPercent", () => {
  it("trims trailing zeros", () => {
    expect(formatPercent(15)).toBe("15%");
    expect(formatPercent(12.5)).toBe("12.5%");
    expect(formatPercent(10)).toBe("10%");
  });
});
