import type { Availability, PricingModel } from "@prisma/client";

/**
 * The "Acme Analytics" example catalog from `catalog-example.xlsx`.
 *
 * Defined once here and shared by both the Prisma seed script and the in-app
 * "Load example catalog" action, so the demo data is identical wherever it is
 * created.
 */

export interface ExampleAvailability {
  status: Availability;
  pricingModel?: PricingModel;
  price?: number;
}

export interface ExampleCatalog {
  productName: string;
  /** Tier name -> base price per seat per month. Order is preserved. */
  tiers: { name: string; basePrice: number }[];
  features: string[];
  /** feature name -> (tier name -> availability) */
  matrix: Record<string, Record<string, ExampleAvailability>>;
}

const INCLUDED: ExampleAvailability = { status: "INCLUDED" };
const NOT_AVAILABLE: ExampleAvailability = { status: "NOT_AVAILABLE" };
const addon = (
  pricingModel: PricingModel,
  price: number,
): ExampleAvailability => ({ status: "ADDON", pricingModel, price });

export const EXAMPLE_CATALOG: ExampleCatalog = {
  productName: "Analytics Suite",
  tiers: [
    { name: "Starter", basePrice: 25 },
    { name: "Growth", basePrice: 50 },
    { name: "Enterprise", basePrice: 100 },
  ],
  features: [
    "Real-time dashboards",
    "Custom reports",
    "API access",
    "Single Sign-On (SSO)",
    "Advanced anomaly detection",
    "Dedicated support",
    "White-label option",
    "Custom integrations",
  ],
  matrix: {
    "Real-time dashboards": {
      Starter: INCLUDED,
      Growth: INCLUDED,
      Enterprise: INCLUDED,
    },
    "Custom reports": {
      Starter: NOT_AVAILABLE,
      Growth: INCLUDED,
      Enterprise: INCLUDED,
    },
    "API access": {
      Starter: NOT_AVAILABLE,
      Growth: addon("PER_SEAT", 50),
      Enterprise: INCLUDED,
    },
    "Single Sign-On (SSO)": {
      Starter: NOT_AVAILABLE,
      Growth: addon("FIXED", 200),
      Enterprise: INCLUDED,
    },
    "Advanced anomaly detection": {
      Starter: NOT_AVAILABLE,
      Growth: addon("PERCENT", 10),
      Enterprise: INCLUDED,
    },
    "Dedicated support": {
      Starter: NOT_AVAILABLE,
      Growth: NOT_AVAILABLE,
      Enterprise: INCLUDED,
    },
    "White-label option": {
      Starter: NOT_AVAILABLE,
      Growth: addon("FIXED", 500),
      Enterprise: addon("FIXED", 300),
    },
    "Custom integrations": {
      Starter: NOT_AVAILABLE,
      Growth: addon("FIXED", 1000),
      Enterprise: addon("PERCENT", 5),
    },
  },
};
