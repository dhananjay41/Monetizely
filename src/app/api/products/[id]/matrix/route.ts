import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { serializeCatalog } from "@/lib/api/serialize";
import { updateMatrix } from "@/lib/services/catalog.service";
import { updateMatrixSchema } from "@/lib/validation/catalog";

export const dynamic = "force-dynamic";

/** Bulk upsert of the feature-availability matrix for a product. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = updateMatrixSchema.parse(await req.json());
    const product = await updateMatrix(id, input);
    return ok(serializeCatalog(product));
  } catch (err) {
    return fail(err);
  }
}
