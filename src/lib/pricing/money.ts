/**
 * Money helpers.
 *
 * All pricing math is done with JS numbers (USD), but we round deliberately to
 * cents so totals are exact and reproducible. Rounding policy: every line item
 * is rounded to cents at the point it is produced, and totals are sums of those
 * already-rounded line items. This matches how an invoice actually adds up and
 * avoids "the parts don't sum to the total" surprises.
 */

/** Round a USD amount to whole cents (2 decimal places), half-up. */
export function round2(value: number): number {
  // Number.EPSILON nudges values like 1.005 that are slightly under in binary
  // floating point back up so they round the way a human expects.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Format a USD amount, e.g. 12750 -> "$12,750.00". */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a percentage for display, trimming trailing zeros.
 * 15 -> "15%", 12.5 -> "12.5%".
 */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
