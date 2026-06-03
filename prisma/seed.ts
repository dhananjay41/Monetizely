import { createExampleCatalog } from "../src/lib/services/catalog.service";
import { prisma } from "../src/lib/db";

/**
 * Seeds the bundled "Acme Analytics" example catalog so a fresh database is
 * immediately usable. Idempotent: re-running it will not create duplicates.
 */
async function main() {
  const product = await createExampleCatalog();
  console.log(`Seeded example catalog: "${product.name}" (id=${product.id})`);
  console.log(`  Tiers: ${product.tiers.map((t) => t.name).join(", ")}`);
  console.log(`  Features: ${product.features.length}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
