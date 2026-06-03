import { fail, ok } from "@/lib/api/respond";
import { serializeQuote } from "@/lib/api/serialize";
import { getQuote } from "@/lib/services/quote.service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quote = await getQuote(id);
    return ok(serializeQuote(quote));
  } catch (err) {
    return fail(err);
  }
}
