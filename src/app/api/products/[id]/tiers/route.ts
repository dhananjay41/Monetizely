import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { createTier } from "@/lib/services/catalog.service";
import { createTierSchema } from "@/lib/validation/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = createTierSchema.parse(await req.json());
    const tier = await createTier(id, input);
    return ok({ id: tier.id, name: tier.name, basePrice: tier.basePrice.toNumber() }, 201);
  } catch (err) {
    return fail(err);
  }
}
