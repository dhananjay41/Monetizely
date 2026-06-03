import type { TermLength } from "./types";

/**
 * Standard term lengths. These are fixed across all clients (per the spec) and
 * therefore live in code, not in the catalog.
 */

/** Number of months billed for each term. */
export const TERM_MONTHS: Record<TermLength, number> = {
  MONTHLY: 1,
  ANNUAL: 12,
  TWO_YEAR: 24,
};

/** Discount applied to the per-seat base price for each term (as a fraction). */
export const TERM_DISCOUNT: Record<TermLength, number> = {
  MONTHLY: 0,
  ANNUAL: 0.15,
  TWO_YEAR: 0.25,
};

/** Human-friendly label for each term, used on the quote view. */
export const TERM_LABEL: Record<TermLength, string> = {
  MONTHLY: "Monthly (1 month, no discount)",
  ANNUAL: "Annual (12 months, 15% discount applies to per-seat price)",
  TWO_YEAR: "Two-year (24 months, 25% discount applies to per-seat price)",
};

/** Short label for compact UI (selects, chips). */
export const TERM_SHORT_LABEL: Record<TermLength, string> = {
  MONTHLY: "Monthly",
  ANNUAL: "Annual",
  TWO_YEAR: "Two-year",
};

/** How many days a quote is valid for after it is created. */
export const QUOTE_VALIDITY_DAYS = 30;
