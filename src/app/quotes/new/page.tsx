"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { CatalogDTO, ProductSummaryDTO, QuoteDTO } from "@/lib/api/dto";
import type { PricingModel, TermLength } from "@prisma/client";
import { TERM_SHORT_LABEL } from "@/lib/pricing/constants";
import { formatUSD } from "@/lib/pricing/money";
import { QuoteBreakdown } from "@/components/QuoteBreakdown";
import {
  Banner,
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  TextInput,
} from "@/components/ui";

interface PricedPreview {
  lineItems: {
    kind: "BASE" | "ADDON" | "DISCOUNT";
    label: string;
    calculation: string;
    notes?: string | null;
    amount: number;
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
}

const TERMS: TermLength[] = ["MONTHLY", "ANNUAL", "TWO_YEAR"];

export default function NewQuotePage() {
  return (
    <Suspense fallback={<Card className="p-6 text-sm text-muted">Loading…</Card>}>
      <QuoteBuilder />
    </Suspense>
  );
}

function QuoteBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductSummaryDTO[]>([]);
  const [catalog, setCatalog] = useState<CatalogDTO | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState("");
  const [tierId, setTierId] = useState("");
  const [seats, setSeats] = useState(10);
  const [term, setTerm] = useState<TermLength>("ANNUAL");
  const [discountPct, setDiscountPct] = useState(0);
  // featureId -> { selected, seats }
  const [addOns, setAddOns] = useState<Record<string, { selected: boolean; seats: number }>>({});

  const [preview, setPreview] = useState<PricedPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load product list once.
  useEffect(() => {
    api
      .get<ProductSummaryDTO[]>("/api/products")
      .then((list) => {
        setProducts(list);
        const initial = searchParams.get("productId") ?? list[0]?.id ?? "";
        setProductId(initial);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load products"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the full catalog whenever the product changes.
  useEffect(() => {
    if (!productId) {
      setCatalog(null);
      return;
    }
    api
      .get<CatalogDTO>(`/api/products/${productId}`)
      .then((c) => {
        setCatalog(c);
        setTierId(c.tiers[0]?.id ?? "");
        setAddOns({});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load catalog"));
  }, [productId]);

  // Add-ons available for the chosen tier (status === ADDON in that tier).
  const availableAddOns = useMemo(() => {
    if (!catalog || !tierId) return [];
    return catalog.features
      .map((f) => {
        const a = f.availabilities.find((x) => x.tierId === tierId);
        if (!a || a.status !== "ADDON" || !a.pricingModel || a.price == null) return null;
        return { featureId: f.id, name: f.name, pricingModel: a.pricingModel, price: a.price };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [catalog, tierId]);

  // Build the request payload shared by preview and save.
  const buildPayload = () => ({
    productId,
    tierId,
    seats,
    term,
    discountPct,
    addOns: availableAddOns
      .filter((a) => addOns[a.featureId]?.selected)
      .map((a) => ({
        featureId: a.featureId,
        seats: a.pricingModel === "PER_SEAT" ? addOns[a.featureId]?.seats ?? 1 : undefined,
      })),
  });

  // Debounced live preview whenever inputs change.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!productId || !tierId || !Number.isFinite(seats) || seats < 1) {
      setPreview(null);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      api
        .post<PricedPreview>("/api/quotes/preview", buildPayload())
        .then((p) => {
          setPreview(p);
          setError(null);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "Preview failed"));
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, tierId, seats, term, discountPct, addOns, availableAddOns.length]);

  function toggleAddOn(featureId: string) {
    setAddOns((prev) => {
      const current = prev[featureId];
      return {
        ...prev,
        [featureId]: { selected: !current?.selected, seats: current?.seats ?? seats },
      };
    });
  }

  function setAddOnSeats(featureId: string, value: number) {
    setAddOns((prev) => ({
      ...prev,
      [featureId]: { selected: prev[featureId]?.selected ?? true, seats: value },
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const quote = await api.post<QuoteDTO>("/api/quotes", {
        ...buildPayload(),
        name,
        customerName,
      });
      router.push(`/quote/${quote.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save quote");
      setSaving(false);
    }
  }

  const pricingLabel: Record<PricingModel, string> = {
    FIXED: "fixed monthly",
    PER_SEAT: "per seat / mo",
    PERCENT: "% of product",
  };

  if (products.length === 0) {
    return (
      <div>
        <PageHeader title="Build a quote" />
        <Banner tone="info">
          You don&apos;t have any products yet. Set up a catalog first on the{" "}
          <a className="underline" href="/catalog">
            Catalog
          </a>{" "}
          page.
        </Banner>
      </div>
    );
  }

  const canSave =
    name.trim() && customerName.trim() && productId && tierId && seats >= 1 && !saving;

  return (
    <div>
      <PageHeader title="Build a quote" description="Configure the quote — the total updates live." />

      {error ? (
        <div className="mb-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left: configuration */}
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <Field label="Quote name">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp - Q3 2026 proposal"
                required
              />
            </Field>
            <Field label="Customer">
              <TextInput
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </Field>
          </Card>

          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product">
                <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tier">
                <Select value={tierId} onChange={(e) => setTierId(e.target.value)}>
                  {catalog?.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatUSD(t.basePrice)}/seat/mo
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Seats">
                <TextInput
                  type="number"
                  min="1"
                  step="1"
                  value={seats}
                  onChange={(e) => setSeats(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
                  required
                />
              </Field>
              <Field label="Term length">
                <Select value={term} onChange={(e) => setTerm(e.target.value as TermLength)}>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {TERM_SHORT_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 font-medium">Add-ons</h2>
            <p className="mb-3 text-sm text-muted">
              Available for the selected tier. Per-seat add-ons can have their own seat count.
            </p>
            {availableAddOns.length === 0 ? (
              <p className="text-sm text-muted">No add-ons available for this tier.</p>
            ) : (
              <ul className="space-y-2">
                {availableAddOns.map((a) => {
                  const state = addOns[a.featureId];
                  return (
                    <li
                      key={a.featureId}
                      className="rounded-lg border border-border p-3"
                      data-testid={`addon-${a.name}`}
                    >
                      <label className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={state?.selected ?? false}
                            onChange={() => toggleAddOn(a.featureId)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium">{a.name}</span>
                        </span>
                        <span className="text-xs text-muted">
                          {a.pricingModel === "PERCENT"
                            ? `${a.price}% ${pricingLabel[a.pricingModel]}`
                            : `${formatUSD(a.price)} ${pricingLabel[a.pricingModel]}`}
                        </span>
                      </label>
                      {state?.selected && a.pricingModel === "PER_SEAT" ? (
                        <div className="mt-2 flex items-center gap-2 pl-6">
                          <span className="text-sm text-muted">Add-on seats:</span>
                          <TextInput
                            type="number"
                            min="1"
                            step="1"
                            value={state.seats}
                            onChange={(e) =>
                              setAddOnSeats(
                                a.featureId,
                                Math.max(1, Math.floor(Number(e.target.value) || 0)),
                              )
                            }
                            className="w-24"
                            aria-label={`${a.name} seats`}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <Field label="Overall discount (%)" hint="Applied to the subtotal of all line items.">
              <TextInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPct}
                onChange={(e) =>
                  setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }
                className="w-32"
              />
            </Field>
          </Card>
        </div>

        {/* Right: live preview */}
        <div>
          <Card className="sticky top-6 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium">Live preview</h2>
              {preview ? (
                <span className="text-sm text-muted">
                  Total <span className="font-semibold text-foreground">{formatUSD(preview.total)}</span>
                </span>
              ) : null}
            </div>
            {preview ? (
              <QuoteBreakdown
                lineItems={preview.lineItems}
                subtotal={preview.subtotal}
                discountAmount={preview.discountAmount}
                total={preview.total}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                Fill in the quote to see the breakdown.
              </p>
            )}
            <div className="mt-5">
              <Button type="submit" disabled={!canSave} className="w-full">
                {saving ? "Saving…" : "Save quote"}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
