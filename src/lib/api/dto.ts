import type { Availability, PricingModel, TermLength } from "@prisma/client";
import type { LineItemKind } from "@/lib/pricing/types";

/**
 * Data Transfer Objects: the JSON contract between the API and the browser.
 * They are plain, fully-serialisable shapes (numbers, strings, ISO dates) —
 * deliberately decoupled from Prisma's `Decimal`/`Date` types.
 */

export interface ProductSummaryDTO {
  id: string;
  name: string;
  tiers: { id: string; name: string; basePrice: number }[];
  featureCount: number;
  createdAt: string;
}

export interface AvailabilityDTO {
  tierId: string;
  status: Availability;
  pricingModel: PricingModel | null;
  price: number | null;
}

export interface FeatureDTO {
  id: string;
  name: string;
  sortOrder: number;
  availabilities: AvailabilityDTO[];
}

export interface TierDTO {
  id: string;
  name: string;
  basePrice: number;
  sortOrder: number;
}

export interface CatalogDTO {
  id: string;
  name: string;
  tiers: TierDTO[];
  features: FeatureDTO[];
}

export interface LineItemDTO {
  kind: LineItemKind;
  label: string;
  calculation: string;
  notes: string | null;
  amount: number;
  sortOrder: number;
}

export interface QuoteDTO {
  id: string;
  name: string;
  customerName: string;
  productName: string;
  tierName: string;
  basePrice: number;
  seats: number;
  term: TermLength;
  discountPct: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  createdAt: string;
  validUntil: string;
  lineItems: LineItemDTO[];
}

export interface QuoteSummaryDTO {
  id: string;
  name: string;
  customerName: string;
  productName: string;
  tierName: string;
  total: number;
  createdAt: string;
}
