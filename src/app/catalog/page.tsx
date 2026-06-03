"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { CatalogDTO, ProductSummaryDTO } from "@/lib/api/dto";
import { formatUSD } from "@/lib/pricing/money";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  TextInput,
} from "@/components/ui";

export default function CatalogListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummaryDTO[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setProducts(await api.get<ProductSummaryDTO[]>("/api/products"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.post<{ id: string }>("/api/products", { name });
      router.push(`/catalog/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
      setBusy(false);
    }
  }

  async function loadExample() {
    setError(null);
    setBusy(true);
    try {
      const created = await api.post<CatalogDTO>("/api/example-catalog");
      router.push(`/catalog/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load example catalog");
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products you can build quotes from. Create one, or load the bundled example."
      />

      {error ? (
        <div className="mb-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {products === null ? (
            <Card className="p-6 text-sm text-muted">Loading…</Card>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products yet"
              description="Create your first product, or load the Acme Analytics example to explore the tool quickly."
              action={
                <Button onClick={loadExample} disabled={busy} variant="secondary">
                  Load example catalog
                </Button>
              }
            />
          ) : (
            products.map((p) => (
              <Link key={p.id} href={`/catalog/${p.id}`} className="block">
                <Card className="flex items-center justify-between p-4 transition hover:border-primary/40 hover:shadow-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.tiers.length} {p.tiers.length === 1 ? "tier" : "tiers"} ·{" "}
                      {p.featureCount} {p.featureCount === 1 ? "feature" : "features"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    {p.tiers.map((t) => (
                      <span key={t.id} className="ml-2">
                        {t.name} {formatUSD(t.basePrice)}
                      </span>
                    ))}
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>

        <Card className="h-fit p-5">
          <h2 className="font-medium">New product</h2>
          <form onSubmit={createProduct} className="mt-4 space-y-4">
            <Field label="Product name">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Analytics Suite"
                required
              />
            </Field>
            <Button type="submit" disabled={busy || !name.trim()} className="w-full">
              Create product
            </Button>
          </form>
          {products && products.length > 0 ? (
            <>
              <div className="my-4 border-t border-border" />
              <Button onClick={loadExample} disabled={busy} variant="ghost" className="w-full">
                Load example catalog
              </Button>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
