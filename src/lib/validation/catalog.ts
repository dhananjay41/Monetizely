import { z } from "zod";

/**
 * Validation schemas for catalog mutations. Used by the API route handlers so
 * that every write is validated at the boundary before it reaches the service
 * layer or the database.
 */

export const availabilityEnum = z.enum(["INCLUDED", "ADDON", "NOT_AVAILABLE"]);
export const pricingModelEnum = z.enum(["FIXED", "PER_SEAT", "PERCENT"]);

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(120),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createTierSchema = z.object({
  name: z.string().trim().min(1, "Tier name is required").max(80),
  basePrice: z
    .number({ invalid_type_error: "Base price must be a number" })
    .nonnegative("Base price cannot be negative"),
});
export type CreateTierInput = z.infer<typeof createTierSchema>;

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1, "Feature name is required").max(120),
});
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;

/**
 * A single matrix cell. When `status` is ADDON, a pricing model and a
 * non-negative price are required. Otherwise pricing fields must be absent.
 */
export const availabilityCellSchema = z
  .object({
    featureId: z.string().min(1),
    tierId: z.string().min(1),
    status: availabilityEnum,
    pricingModel: pricingModelEnum.optional(),
    price: z.number().nonnegative().optional(),
  })
  .superRefine((cell, ctx) => {
    if (cell.status === "ADDON") {
      if (!cell.pricingModel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingModel"],
          message: "Add-on cells require a pricing model",
        });
      }
      if (cell.price === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Add-on cells require a price",
        });
      }
      if (cell.pricingModel === "PERCENT" && cell.price !== undefined && cell.price > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Percentage add-on cannot exceed 100%",
        });
      }
    }
  });
export type AvailabilityCellInput = z.infer<typeof availabilityCellSchema>;

/** Bulk update of matrix cells for a product. */
export const updateMatrixSchema = z.object({
  cells: z.array(availabilityCellSchema).min(1),
});
export type UpdateMatrixInput = z.infer<typeof updateMatrixSchema>;
