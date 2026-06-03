import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api/respond";
import { serializeQuote, serializeQuoteSummary } from "@/lib/api/serialize";
import { createQuote, listQuotes } from "@/lib/services/quote.service";
import { createQuoteSchema } from "@/lib/validation/quote";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const quotes = await listQuotes();
    return ok(quotes.map(serializeQuoteSummary));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = createQuoteSchema.parse(await req.json());
    const quote = await createQuote(input);
    return ok(serializeQuote(quote), 201);
  } catch (err) {
    return fail(err);
  }
}
