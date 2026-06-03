import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { createFeature } from "@/lib/services/catalog.service";
import { createFeatureSchema } from "@/lib/validation/catalog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = createFeatureSchema.parse(await req.json());
    const feature = await createFeature(id, input);
    return ok({ id: feature.id, name: feature.name }, 201);
  } catch (err) {
    return fail(err);
  }
}
