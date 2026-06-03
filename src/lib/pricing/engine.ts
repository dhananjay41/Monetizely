/**
 * The pricing engine — the single source of truth for quote math.
 *
 * It is a pure function of its input: given a `QuoteInput` it returns a fully
 * explained `PricedQuote`. No I/O, no dates, no randomness. That purity is what
 * lets the unit tests pin the math down precisely.
 *
 * Calculation rules (see README "Decisions & assumptions" for the reasoning):
 *   BASE      = seats x basePrice x months x (1 - termDiscount)
 *   FIXED     = value x months                       (term discount NOT applied)
 *   PER_SEAT  = addOnSeats x value x months          (term discount NOT applied)
 *   PERCENT   = (value / 100) x BASE line amount
 *   subtotal  = sum(BASE, all ADDONs)
 *   discount  = subtotal x (discountPct / 100)
 *   total     = subtotal - discount
 */

import { TERM_DISCOUNT, TERM_MONTHS } from "./constants";
import { formatPercent, formatUSD, round2 } from "./money";
import type { AddOnSelection, LineItem, PricedQuote, QuoteInput } from "./types";

/** Build the BASE product line item. */
function buildBaseLine(input: QuoteInput): LineItem {
  const months = TERM_MONTHS[input.term];
  const discount = TERM_DISCOUNT[input.term];
  const amount = round2(input.seats * input.basePrice * months * (1 - discount));

  const seatLabel = `${input.seats} ${input.seats === 1 ? "seat" : "seats"}`;
  const discountClause =
    discount > 0
      ? ` × (1 − ${formatPercent(discount * 100)} ${termAdjective(input)} discount)`
      : "";

  return {
    kind: "BASE",
    label: `${input.productName} — ${input.tierName} tier`,
    calculation: `${seatLabel} × ${formatUSD(input.basePrice)} per seat per month × ${months} ${
      months === 1 ? "month" : "months"
    }${discountClause}`,
    notes: "Base product cost",
    amount,
  };
}

function termAdjective(input: QuoteInput): string {
  switch (input.term) {
    case "ANNUAL":
      return "annual";
    case "TWO_YEAR":
      return "two-year";
    default:
      return "";
  }
}

/** Build a single ADDON line item given the already-computed base amount. */
function buildAddOnLine(
  addOn: AddOnSelection,
  months: number,
  baseAmount: number,
): LineItem {
  switch (addOn.pricingModel) {
    case "FIXED": {
      const amount = round2(addOn.value * months);
      return {
        kind: "ADDON",
        label: `Add-on: ${addOn.featureName}`,
        calculation: `${formatUSD(addOn.value)} per month × ${months} ${
          months === 1 ? "month" : "months"
        }`,
        notes: "Fixed monthly add-on price",
        amount,
      };
    }
    case "PER_SEAT": {
      const seats = addOn.seats ?? 0;
      const amount = round2(seats * addOn.value * months);
      return {
        kind: "ADDON",
        label: `Add-on: ${addOn.featureName}`,
        calculation: `${seats} ${seats === 1 ? "seat" : "seats"} × ${formatUSD(
          addOn.value,
        )} per seat per month × ${months} ${months === 1 ? "month" : "months"}`,
        notes: "Per-seat add-on (seat count is independent of the product seats)",
        amount,
      };
    }
    case "PERCENT": {
      const amount = round2((addOn.value / 100) * baseAmount);
      return {
        kind: "ADDON",
        label: `Add-on: ${addOn.featureName}`,
        calculation: `${formatPercent(addOn.value)} of base product cost (${formatUSD(
          baseAmount,
        )})`,
        notes: "Percent-of-product add-on",
        amount,
      };
    }
    default: {
      // Exhaustiveness guard: if a new PricingModel is added the compiler will
      // flag this branch.
      const _exhaustive: never = addOn.pricingModel;
      throw new Error(`Unknown pricing model: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Price a quote. Pure and deterministic.
 *
 * @throws if `seats`, `basePrice`, `discountPct`, or any add-on value/seats is
 *   negative — these indicate a programming/validation error upstream.
 */
export function priceQuote(input: QuoteInput): PricedQuote {
  assertNonNegative("seats", input.seats);
  assertNonNegative("basePrice", input.basePrice);
  assertInRange("discountPct", input.discountPct, 0, 100);

  const months = TERM_MONTHS[input.term];

  const baseLine = buildBaseLine(input);
  const lineItems: LineItem[] = [baseLine];

  for (const addOn of input.addOns) {
    assertNonNegative(`add-on "${addOn.featureName}" value`, addOn.value);
    if (addOn.pricingModel === "PER_SEAT") {
      assertNonNegative(`add-on "${addOn.featureName}" seats`, addOn.seats ?? 0);
    }
    lineItems.push(buildAddOnLine(addOn, months, baseLine.amount));
  }

  const subtotal = round2(
    lineItems.reduce((sum, item) => sum + item.amount, 0),
  );

  const discountAmount = round2(subtotal * (input.discountPct / 100));

  if (discountAmount > 0) {
    lineItems.push({
      kind: "DISCOUNT",
      label: "Overall quote discount",
      calculation: `${formatPercent(input.discountPct)} discount applied to ${formatUSD(
        subtotal,
      )} subtotal`,
      notes: "Applied to the subtotal of all line items",
      amount: -discountAmount,
    });
  }

  const total = round2(subtotal - discountAmount);

  return { lineItems, subtotal, discountAmount, total };
}

function assertNonNegative(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number (received ${value}).`);
  }
}

function assertInRange(field: string, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max} (received ${value}).`);
  }
}
