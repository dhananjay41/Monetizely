"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { QuoteSummaryDTO } from "@/lib/api/dto";
import { formatUSD } from "@/lib/pricing/money";
import { Banner, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";

export default function QuotesListPage() {
  const [quotes, setQuotes] = useState<QuoteSummaryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<QuoteSummaryDTO[]>("/api/quotes")
      .then(setQuotes)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load quotes"));
  }, []);

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Saved quotes. Each has a shareable, read-only URL."
        action={<LinkButton href="/quotes/new">New quote</LinkButton>}
      />

      {error ? (
        <div className="mb-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      {quotes === null ? (
        <Card className="p-6 text-sm text-muted">Loading…</Card>
      ) : quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          description="Build your first quote from a catalog product."
          action={<LinkButton href="/quotes/new">Build a quote</LinkButton>}
        />
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <Link key={q.id} href={`/quote/${q.id}`} className="block">
              <Card className="flex items-center justify-between p-4 transition hover:border-primary/40 hover:shadow-sm">
                <div>
                  <p className="font-medium">{q.name}</p>
                  <p className="text-xs text-muted">
                    {q.customerName} · {q.productName} — {q.tierName} ·{" "}
                    {new Date(q.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatUSD(q.total)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
