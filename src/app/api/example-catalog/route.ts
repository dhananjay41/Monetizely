import { fail, ok } from "@/lib/api/respond";
import { serializeCatalog } from "@/lib/api/serialize";
import { createExampleCatalog } from "@/lib/services/catalog.service";

export const dynamic = "force-dynamic";

/** One-click loader for the bundled "Acme Analytics" example catalog. */
export async function POST() {
  try {
    const product = await createExampleCatalog();
    return ok(serializeCatalog(product), 201);
  } catch (err) {
    return fail(err);
  }
}
