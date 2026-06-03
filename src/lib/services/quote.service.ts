import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { priceQuote } from "@/lib/pricing";
import { QUOTE_VALIDITY_DAYS } from "@/lib/pricing/constants";
import type { AddOnSelection, PricedQuote, QuoteInput } from "@/lib/pricing/types";
import type {
  AddOnSelectionInput,
  CreateQuoteInput,
  PreviewQuoteInput,
} from "@/lib/validation/quote";

/**
 * Quote operations. The defining job of this service is to turn a client's
 * selections into a trustworthy `QuoteInput` for the pure pricing engine:
 * product/tier are looked up, add-on prices are resolved from the catalog (never
 * taken from the client), and everything is validated against the matrix.
 */

/**
 * Resolve the catalog into a `QuoteInput` the engine can price. Throws
 * `ValidationError` / `NotFoundError` for any selection that is not valid for
 * the chosen tier.
 */
async function buildQuoteInput(input: {
  productId: string;
  tierId: string;
  seats: number;
  term: PreviewQuoteInput["term"];
  discountPct: number;
  addOns: AddOnSelectionInput[];
}): Promise<{ engineInput: QuoteInput; basePrice: number; productName: string; tierName: string }> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: {
      tiers: { where: { id: input.tierId } },
    },
  });
  if (!product) throw new NotFoundError("Product not found");

  const tier = product.tiers[0];
  if (!tier) throw new ValidationError("The selected tier does not belong to this product");

  const basePrice = tier.basePrice.toNumber();

  const resolvedAddOns: AddOnSelection[] = [];
  for (const selection of input.addOns) {
    const availability = await prisma.featureAvailability.findUnique({
      where: { featureId_tierId: { featureId: selection.featureId, tierId: tier.id } },
      include: { feature: true },
    });

    if (!availability || availability.status !== "ADDON") {
      throw new ValidationError(
        "One of the selected add-ons is not available as an add-on for this tier",
      );
    }
    if (!availability.pricingModel || availability.price === null) {
      throw new ValidationError("An add-on is misconfigured in the catalog (missing pricing)");
    }

    if (availability.pricingModel === "PER_SEAT" && (!selection.seats || selection.seats < 1)) {
      throw new ValidationError(
        `Add-on "${availability.feature.name}" needs a seat count of at least 1`,
      );
    }

    resolvedAddOns.push({
      featureName: availability.feature.name,
      pricingModel: availability.pricingModel,
      value: availability.price.toNumber(),
      seats: availability.pricingModel === "PER_SEAT" ? selection.seats : undefined,
    });
  }

  const engineInput: QuoteInput = {
    productName: product.name,
    tierName: tier.name,
    basePrice,
    seats: input.seats,
    term: input.term,
    discountPct: input.discountPct,
    addOns: resolvedAddOns,
  };

  return { engineInput, basePrice, productName: product.name, tierName: tier.name };
}

/** Price a quote without persisting it (used to render the live preview). */
export async function previewQuote(input: PreviewQuoteInput): Promise<PricedQuote> {
  const { engineInput } = await buildQuoteInput(input);
  return priceQuote(engineInput);
}

/**
 * Price and persist a quote as an immutable snapshot. The computed line items
 * and the tier base price are stored, so later catalog edits never change a
 * quote that has already been created.
 */
export async function createQuote(input: CreateQuoteInput, now: Date = new Date()) {
  const { engineInput, basePrice, productName, tierName } = await buildQuoteInput(input);
  const priced = priceQuote(engineInput);

  const validUntil = new Date(now);
  validUntil.setUTCDate(validUntil.getUTCDate() + QUOTE_VALIDITY_DAYS);

  return prisma.quote.create({
    data: {
      name: input.name,
      customerName: input.customerName,
      validUntil,
      productId: input.productId,
      tierId: input.tierId,
      productName,
      tierName,
      basePriceSnapshot: new Prisma.Decimal(basePrice),
      seats: input.seats,
      term: input.term,
      discountPct: new Prisma.Decimal(input.discountPct),
      subtotal: new Prisma.Decimal(priced.subtotal),
      discountAmount: new Prisma.Decimal(priced.discountAmount),
      total: new Prisma.Decimal(priced.total),
      lineItems: {
        create: priced.lineItems.map((item, index) => ({
          kind: item.kind,
          label: item.label,
          calculation: item.calculation,
          notes: item.notes ?? null,
          amount: new Prisma.Decimal(item.amount),
          sortOrder: index,
        })),
      },
    },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getQuote(id: string) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) throw new NotFoundError("Quote not found");
  return quote;
}

export async function listQuotes() {
  return prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      customerName: true,
      productName: true,
      tierName: true,
      total: true,
      createdAt: true,
    },
  });
}
