import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { serializeProductSummary } from "@/lib/api/serialize";
import { createProduct, listProducts } from "@/lib/services/catalog.service";
import { createProductSchema } from "@/lib/validation/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await listProducts();
    return ok(products.map(serializeProductSummary));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createProductSchema.parse(body);
    const product = await createProduct(input);
    return ok({ id: product.id, name: product.name }, 201);
  } catch (err) {
    return fail(err);
  }
}
