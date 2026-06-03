import { Prisma } from "@prisma/client";
import type {
  CatalogDTO,
  ProductSummaryDTO,
  QuoteDTO,
  QuoteSummaryDTO,
} from "./dto";

/**
 * Map Prisma payloads to DTOs, converting `Decimal` -> number and `Date` -> ISO
 * string. Input types use structural shapes so these mappers stay decoupled
 * from the exact `include` used at the call site.
 */

const num = (d: Prisma.Decimal) => d.toNumber();
const numOrNull = (d: Prisma.Decimal | null) => (d === null ? null : d.toNumber());

type TierRow = { id: string; name: string; basePrice: Prisma.Decimal; sortOrder: number };

export function serializeProductSummary(p: {
  id: string;
  name: string;
  createdAt: Date;
  tiers: TierRow[];
  _count: { features: number };
}): ProductSummaryDTO {
  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    featureCount: p._count.features,
    tiers: p.tiers.map((t) => ({ id: t.id, name: t.name, basePrice: num(t.basePrice) })),
  };
}

export function serializeCatalog(p: {
  id: string;
  name: string;
  tiers: TierRow[];
  features: {
    id: string;
    name: string;
    sortOrder: number;
    availabilities: {
      tierId: string;
      status: CatalogDTO["features"][number]["availabilities"][number]["status"];
      pricingModel: Prisma.FeatureAvailabilityGetPayload<object>["pricingModel"];
      price: Prisma.Decimal | null;
    }[];
  }[];
}): CatalogDTO {
  return {
    id: p.id,
    name: p.name,
    tiers: p.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      basePrice: num(t.basePrice),
      sortOrder: t.sortOrder,
    })),
    features: p.features.map((f) => ({
      id: f.id,
      name: f.name,
      sortOrder: f.sortOrder,
      availabilities: f.availabilities.map((a) => ({
        tierId: a.tierId,
        status: a.status,
        pricingModel: a.pricingModel,
        price: numOrNull(a.price),
      })),
    })),
  };
}

export function serializeQuote(q: {
  id: string;
  name: string;
  customerName: string;
  productName: string;
  tierName: string;
  basePriceSnapshot: Prisma.Decimal;
  seats: number;
  term: QuoteDTO["term"];
  discountPct: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  createdAt: Date;
  validUntil: Date;
  lineItems: {
    kind: QuoteDTO["lineItems"][number]["kind"];
    label: string;
    calculation: string;
    notes: string | null;
    amount: Prisma.Decimal;
    sortOrder: number;
  }[];
}): QuoteDTO {
  return {
    id: q.id,
    name: q.name,
    customerName: q.customerName,
    productName: q.productName,
    tierName: q.tierName,
    basePrice: num(q.basePriceSnapshot),
    seats: q.seats,
    term: q.term,
    discountPct: num(q.discountPct),
    subtotal: num(q.subtotal),
    discountAmount: num(q.discountAmount),
    total: num(q.total),
    createdAt: q.createdAt.toISOString(),
    validUntil: q.validUntil.toISOString(),
    lineItems: q.lineItems
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((li) => ({
        kind: li.kind,
        label: li.label,
        calculation: li.calculation,
        notes: li.notes,
        amount: num(li.amount),
        sortOrder: li.sortOrder,
      })),
  };
}

export function serializeQuoteSummary(q: {
  id: string;
  name: string;
  customerName: string;
  productName: string;
  tierName: string;
  total: Prisma.Decimal;
  createdAt: Date;
}): QuoteSummaryDTO {
  return {
    id: q.id,
    name: q.name,
    customerName: q.customerName,
    productName: q.productName,
    tierName: q.tierName,
    total: num(q.total),
    createdAt: q.createdAt.toISOString(),
  };
}
