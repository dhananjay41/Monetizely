import { fail, ok } from "@/lib/api/respond";
import { serializeCatalog } from "@/lib/api/serialize";
import { getProduct } from "@/lib/services/catalog.service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    return ok(serializeCatalog(product));
  } catch (err) {
    return fail(err);
  }
}
