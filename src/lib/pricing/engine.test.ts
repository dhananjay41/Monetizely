import { describe, expect, it } from "vitest";
import { priceQuote } from "./engine";
import type { QuoteInput } from "./types";

/**
 * The pricing engine is the heart of the tool, so it gets the most thorough
 * coverage: every add-on model, every term, discounts, rounding, the exact
 * sample quote from the spec, and input validation.
 */

const base: QuoteInput = {
  productName: "Analytics Suite",
  tierName: "Growth",
  basePrice: 50,
  seats: 25,
  term: "ANNUAL",
  discountPct: 0,
  addOns: [],
};

describe("base product line", () => {
  it("applies seats × basePrice × months × (1 − termDiscount) for annual", () => {
    const result = priceQuote(base);
    // 25 × 50 × 12 × 0.85 = 12,750
    expect(result.lineItems[0]!.amount).toBe(12750);
    expect(result.total).toBe(12750);
  });

  it("charges 1 month with no discount for a monthly term", () => {
    const result = priceQuote({ ...base, term: "MONTHLY" });
    // 25 × 50 × 1 × 1 = 1,250
    expect(result.lineItems[0]!.amount).toBe(1250);
    expect(result.lineItems[0]!.calculation).not.toContain("discount");
  });

  it("applies a 25% discount over 24 months for a two-year term", () => {
    const result = priceQuote({ ...base, term: "TWO_YEAR" });
    // 25 × 50 × 24 × 0.75 = 22,500
    expect(result.lineItems[0]!.amount).toBe(22500);
  });

  it("handles a single seat (label is singular)", () => {
    const result = priceQuote({ ...base, seats: 1, term: "MONTHLY" });
    expect(result.lineItems[0]!.amount).toBe(50);
    expect(result.lineItems[0]!.calculation).toContain("1 seat ");
  });
});

describe("add-on pricing models", () => {
  it("FIXED monthly add-on = value × months, ignoring the term discount", () => {
    const result = priceQuote({
      ...base,
      addOns: [{ featureName: "SSO", pricingModel: "FIXED", value: 200 }],
    });
    // $200 × 12 = 2,400 (no 15% discount applied to add-ons)
    const addon = result.lineItems.find((l) => l.label.includes("SSO"));
    expect(addon!.amount).toBe(2400);
  });

  it("PER_SEAT add-on uses its own seat count, independent of product seats", () => {
    const result = priceQuote({
      ...base,
      seats: 25,
      addOns: [{ featureName: "API access", pricingModel: "PER_SEAT", value: 50, seats: 5 }],
    });
    // 5 × $50 × 12 = 3,000 (5 add-on seats, not the 25 product seats)
    const addon = result.lineItems.find((l) => l.label.includes("API access"));
    expect(addon!.amount).toBe(3000);
  });

  it("PERCENT add-on = pct × base product line amount", () => {
    const result = priceQuote({
      ...base,
      addOns: [{ featureName: "Anomaly detection", pricingModel: "PERCENT", value: 10 }],
    });
    // base = 12,750; 10% = 1,275
    const addon = result.lineItems.find((l) => l.label.includes("Anomaly"));
    expect(addon!.amount).toBe(1275);
    expect(addon!.calculation).toContain("$12,750.00");
  });

  it("PERCENT add-on references the discounted base, not the list price", () => {
    // Two-year base = 22,500; 5% = 1,125
    const result = priceQuote({
      ...base,
      term: "TWO_YEAR",
      addOns: [{ featureName: "Custom integrations", pricingModel: "PERCENT", value: 5 }],
    });
    const addon = result.lineItems.find((l) => l.label.includes("Custom integrations"));
    expect(addon!.amount).toBe(1125);
  });
});

describe("overall quote discount", () => {
  it("applies the discount to the subtotal of all line items", () => {
    const result = priceQuote({
      ...base,
      discountPct: 10,
      addOns: [{ featureName: "SSO", pricingModel: "FIXED", value: 200 }],
    });
    // subtotal = 12,750 + 2,400 = 15,150; 10% = 1,515; total = 13,635
    expect(result.subtotal).toBe(15150);
    expect(result.discountAmount).toBe(1515);
    expect(result.total).toBe(13635);
    const discountLine = result.lineItems.find((l) => l.kind === "DISCOUNT");
    expect(discountLine!.amount).toBe(-1515);
  });

  it("adds no discount line item when the discount is zero", () => {
    const result = priceQuote({ ...base, discountPct: 0 });
    expect(result.lineItems.some((l) => l.kind === "DISCOUNT")).toBe(false);
    expect(result.discountAmount).toBe(0);
  });

  it("supports a 100% discount (total of zero)", () => {
    const result = priceQuote({ ...base, discountPct: 100 });
    expect(result.total).toBe(0);
  });
});

describe("rounding", () => {
  it("rounds each line item to cents", () => {
    // 10% of base where base has odd cents: basePrice 33.33, 3 seats, monthly
    const result = priceQuote({
      ...base,
      basePrice: 33.33,
      seats: 3,
      term: "MONTHLY",
      addOns: [{ featureName: "Pct", pricingModel: "PERCENT", value: 10 }],
    });
    // base = 3 × 33.33 = 99.99; 10% = 9.999 -> 10.00
    expect(result.lineItems[0]!.amount).toBe(99.99);
    expect(result.lineItems[1]!.amount).toBe(10);
    expect(result.total).toBe(109.99);
  });

  it("line items always sum exactly to the total", () => {
    const result = priceQuote({
      ...base,
      basePrice: 49.99,
      seats: 7,
      discountPct: 12.5,
      addOns: [
        { featureName: "A", pricingModel: "PER_SEAT", value: 12.34, seats: 3 },
        { featureName: "B", pricingModel: "PERCENT", value: 7.5 },
      ],
    });
    const sum = result.lineItems.reduce((s, l) => s + l.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(result.total);
  });
});

describe("the spec's sample quote (Acme Corp - Q3 2026)", () => {
  it("reproduces the $18,150 total exactly", () => {
    const result = priceQuote({
      productName: "Analytics Suite",
      tierName: "Growth",
      basePrice: 50,
      seats: 25,
      term: "ANNUAL",
      discountPct: 0,
      addOns: [
        { featureName: "Single Sign-On (SSO)", pricingModel: "FIXED", value: 200 },
        { featureName: "API access", pricingModel: "PER_SEAT", value: 50, seats: 5 },
      ],
    });
    expect(result.lineItems[0]!.amount).toBe(12750); // base
    expect(result.lineItems[1]!.amount).toBe(2400); // SSO
    expect(result.lineItems[2]!.amount).toBe(3000); // API access
    expect(result.total).toBe(18150);
  });
});

describe("input validation", () => {
  it("rejects negative seats", () => {
    expect(() => priceQuote({ ...base, seats: -1 })).toThrow(/seats/);
  });

  it("rejects a negative base price", () => {
    expect(() => priceQuote({ ...base, basePrice: -10 })).toThrow(/basePrice/);
  });

  it("rejects a discount above 100%", () => {
    expect(() => priceQuote({ ...base, discountPct: 150 })).toThrow(/discountPct/);
  });

  it("rejects a negative add-on value", () => {
    expect(() =>
      priceQuote({ ...base, addOns: [{ featureName: "X", pricingModel: "FIXED", value: -1 }] }),
    ).toThrow(/value/);
  });
});
