/**
 * Domain types for the pricing engine.
 *
 * These are intentionally plain, database-agnostic shapes. The engine in
 * `engine.ts` operates only on these types so the math can be unit-tested in
 * isolation, with no Prisma or HTTP layer involved.
 */

export type TermLength = "MONTHLY" | "ANNUAL" | "TWO_YEAR";

export type PricingModel = "FIXED" | "PER_SEAT" | "PERCENT";

export type LineItemKind = "BASE" | "ADDON" | "DISCOUNT";

/** An add-on the analyst has chosen to include on the quote. */
export interface AddOnSelection {
  /** Display name of the underlying feature, e.g. "Single Sign-On (SSO)". */
  featureName: string;
  pricingModel: PricingModel;
  /**
   * For FIXED / PER_SEAT this is a USD amount.
   * For PERCENT this is a percentage (e.g. `10` => 10% of base product cost).
   */
  value: number;
  /**
   * Number of seats for a PER_SEAT add-on. This is deliberately independent of
   * the product seat count — a customer may buy fewer seats of an add-on than
   * of the product itself. Ignored for FIXED / PERCENT models.
   */
  seats?: number;
}

/** Everything needed to price a quote. No persistence concerns leak in here. */
export interface QuoteInput {
  productName: string;
  tierName: string;
  /** Tier base price, USD per seat per month. */
  basePrice: number;
  seats: number;
  term: TermLength;
  /** Overall quote-level discount, as a percentage (0–100). */
  discountPct: number;
  addOns: AddOnSelection[];
}

/** A single, fully-explained row in the quote breakdown. */
export interface LineItem {
  kind: LineItemKind;
  label: string;
  /** Human-readable explanation of exactly how `amount` was derived. */
  calculation: string;
  notes?: string;
  /** USD, rounded to cents. Negative for the DISCOUNT row. */
  amount: number;
}

/** The result of pricing a quote: the breakdown plus the headline numbers. */
export interface PricedQuote {
  lineItems: LineItem[];
  /** Sum of BASE + ADDON line items, before any overall discount. */
  subtotal: number;
  /** USD value of the overall quote discount (>= 0). */
  discountAmount: number;
  /** subtotal − discountAmount. */
  total: number;
}
