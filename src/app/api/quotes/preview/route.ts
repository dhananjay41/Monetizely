import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { previewQuote } from "@/lib/services/quote.service";
import { previewQuoteSchema } from "@/lib/validation/quote";

export const dynamic = "force-dynamic";

/** Price a quote live, without saving it — drives the builder's running total. */
export async function POST(req: NextRequest) {
  try {
    const input = previewQuoteSchema.parse(await req.json());
    const priced = await previewQuote(input);
    return ok(priced);
  } catch (err) {
    return fail(err);
  }
}
