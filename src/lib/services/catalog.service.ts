import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { EXAMPLE_CATALOG } from "@/lib/catalog/example";
import type {
  CreateFeatureInput,
  CreateProductInput,
  CreateTierInput,
  UpdateMatrixInput,
} from "@/lib/validation/catalog";

/**
 * Catalog read/write operations. Keeps all Prisma access for the catalog in one
 * place so the API handlers stay thin and the data-shaping is consistent.
 */

/** Product with everything needed to render the catalog editor / quote builder. */
export type ProductWithCatalog = Prisma.ProductGetPayload<{
  include: {
    tiers: { orderBy: { sortOrder: "asc" } };
    features: { orderBy: { sortOrder: "asc" } };
  };
}> & {
  features: Array<
    Prisma.FeatureGetPayload<{ include: { availabilities: true } }>
  >;
};

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      tiers: { orderBy: { sortOrder: "asc" } },
      _count: { select: { features: true } },
    },
  });
}

/** Full catalog for one product (tiers, features, and every matrix cell). */
export async function getProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tiers: { orderBy: { sortOrder: "asc" } },
      features: {
        orderBy: { sortOrder: "asc" },
        include: { availabilities: true },
      },
    },
  });
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({ data: { name: input.name } });
}

export async function createTier(productId: string, input: CreateTierInput) {
  await ensureProductExists(productId);
  const count = await prisma.tier.count({ where: { productId } });
  try {
    return await prisma.tier.create({
      data: {
        productId,
        name: input.name,
        basePrice: new Prisma.Decimal(input.basePrice),
        sortOrder: count,
      },
    });
  } catch (err) {
    throw translateUniqueViolation(err, `A tier named "${input.name}" already exists`);
  }
}

export async function createFeature(productId: string, input: CreateFeatureInput) {
  await ensureProductExists(productId);
  const count = await prisma.feature.count({ where: { productId } });
  try {
    return await prisma.feature.create({
      data: { productId, name: input.name, sortOrder: count },
    });
  } catch (err) {
    throw translateUniqueViolation(err, `A feature named "${input.name}" already exists`);
  }
}

/**
 * Upsert a batch of matrix cells. Validates that every feature and tier belongs
 * to the product before writing, then upserts each (feature, tier) cell. Runs
 * in a transaction so the matrix update is all-or-nothing.
 */
export async function updateMatrix(productId: string, input: UpdateMatrixInput) {
  const product = await getProduct(productId);
  const featureIds = new Set(product.features.map((f) => f.id));
  const tierIds = new Set(product.tiers.map((t) => t.id));

  for (const cell of input.cells) {
    if (!featureIds.has(cell.featureId)) {
      throw new ValidationError(`Feature ${cell.featureId} does not belong to this product`);
    }
    if (!tierIds.has(cell.tierId)) {
      throw new ValidationError(`Tier ${cell.tierId} does not belong to this product`);
    }
  }

  await prisma.$transaction(
    input.cells.map((cell) => {
      const data = {
        status: cell.status,
        pricingModel: cell.status === "ADDON" ? cell.pricingModel ?? null : null,
        price:
          cell.status === "ADDON" && cell.price !== undefined
            ? new Prisma.Decimal(cell.price)
            : null,
      };
      return prisma.featureAvailability.upsert({
        where: { featureId_tierId: { featureId: cell.featureId, tierId: cell.tierId } },
        update: data,
        create: { featureId: cell.featureId, tierId: cell.tierId, ...data },
      });
    }),
  );

  return getProduct(productId);
}

/**
 * Create the bundled "Acme Analytics" example catalog. Idempotent-ish: if a
 * product with the same name already exists it is returned untouched rather
 * than duplicated.
 */
export async function createExampleCatalog() {
  const existing = await prisma.product.findFirst({
    where: { name: EXAMPLE_CATALOG.productName },
  });
  if (existing) return getProduct(existing.id);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { name: EXAMPLE_CATALOG.productName },
    });

    const tierByName = new Map<string, string>();
    for (const [i, tier] of EXAMPLE_CATALOG.tiers.entries()) {
      const created = await tx.tier.create({
        data: {
          productId: product.id,
          name: tier.name,
          basePrice: new Prisma.Decimal(tier.basePrice),
          sortOrder: i,
        },
      });
      tierByName.set(tier.name, created.id);
    }

    const featureByName = new Map<string, string>();
    for (const [i, name] of EXAMPLE_CATALOG.features.entries()) {
      const created = await tx.feature.create({
        data: { productId: product.id, name, sortOrder: i },
      });
      featureByName.set(name, created.id);
    }

    const cells: Prisma.FeatureAvailabilityCreateManyInput[] = [];
    for (const [featureName, perTier] of Object.entries(EXAMPLE_CATALOG.matrix)) {
      const featureId = featureByName.get(featureName)!;
      for (const [tierName, cell] of Object.entries(perTier)) {
        cells.push({
          featureId,
          tierId: tierByName.get(tierName)!,
          status: cell.status,
          pricingModel: cell.pricingModel ?? null,
          price: cell.price !== undefined ? new Prisma.Decimal(cell.price) : null,
        });
      }
    }
    await tx.featureAvailability.createMany({ data: cells });

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        tiers: { orderBy: { sortOrder: "asc" } },
        features: { orderBy: { sortOrder: "asc" }, include: { availabilities: true } },
      },
    });
  }, { timeout: 30000 });
}

async function ensureProductExists(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("Product not found");
}

function translateUniqueViolation(err: unknown, message: string): unknown {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return new ConflictError(message);
  }
  return err;
}
