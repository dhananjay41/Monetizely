import { z } from "zod";

/** Validation for building / previewing a quote. */

export const termEnum = z.enum(["MONTHLY", "ANNUAL", "TWO_YEAR"]);

/**
 * What the client selects for an add-on. Deliberately minimal: the client picks
 * *which* add-on (by feature) and, for per-seat add-ons, how many seats. The
 * pricing model and dollar values are resolved server-side from the catalog so
 * the client can never dictate prices.
 */
export const addOnSelectionSchema = z.object({
  featureId: z.string().min(1),
  /** Only used for PER_SEAT add-ons; validated against the resolved model. */
  seats: z.number().int().positive().optional(),
});
export type AddOnSelectionInput = z.infer<typeof addOnSelectionSchema>;

/** Shared shape for both preview and create. */
const quoteBase = {
  productId: z.string().min(1, "Choose a product"),
  tierId: z.string().min(1, "Choose a tier"),
  seats: z
    .number({ invalid_type_error: "Seats must be a number" })
    .int("Seats must be a whole number")
    .positive("Seats must be at least 1"),
  term: termEnum,
  discountPct: z.number().min(0).max(100).default(0),
  addOns: z.array(addOnSelectionSchema).default([]),
};

/** Preview does not persist, so it does not need customer/quote names. */
export const previewQuoteSchema = z.object(quoteBase);
export type PreviewQuoteInput = z.infer<typeof previewQuoteSchema>;

export const createQuoteSchema = z.object({
  ...quoteBase,
  name: z.string().trim().min(1, "Quote name is required").max(160),
  customerName: z.string().trim().min(1, "Customer name is required").max(160),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
