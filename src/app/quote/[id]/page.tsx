import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuote } from "@/lib/services/quote.service";
import { serializeQuote } from "@/lib/api/serialize";
import { NotFoundError } from "@/lib/errors";
import { TERM_LABEL } from "@/lib/pricing/constants";
import { formatUSD } from "@/lib/pricing/money";
import { QuoteBreakdown } from "@/components/QuoteBreakdown";
import { Card } from "@/components/ui";
import { CopyLinkButton } from "./CopyLinkButton";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function QuoteViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quote;
  try {
    quote = serializeQuote(await getQuote(id));
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/quotes" className="text-sm text-muted hover:text-foreground">
          ← All quotes
        </Link>
        <CopyLinkButton />
      </div>

      <Card className="p-8">
        <header className="mb-6 border-b border-border pb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Quote</p>
          <h1 className="mt-1 text-2xl font-semibold">{quote.name}</h1>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Detail label="Customer" value={quote.customerName} />
            <Detail label="Quote date" value={formatDate(quote.createdAt)} />
            <Detail label="Valid until" value={formatDate(quote.validUntil)} />
          </dl>
        </header>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            What is being purchased
          </h2>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <Detail label="Product" value={quote.productName} />
            <Detail label="Tier" value={quote.tierName} />
            <Detail label="Seats" value={String(quote.seats)} />
            <Detail label="Base price" value={`${formatUSD(quote.basePrice)} / seat / month`} />
            <Detail label="Term length" value={TERM_LABEL[quote.term]} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Cost breakdown
          </h2>
          <QuoteBreakdown
            lineItems={quote.lineItems}
            subtotal={quote.subtotal}
            discountAmount={quote.discountAmount}
            total={quote.total}
          />
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted">
          All amounts in USD. This is a read-only quote document — anyone with this link can view it.
        </footer>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium sm:mt-0.5">{value}</dd>
    </div>
  );
}
