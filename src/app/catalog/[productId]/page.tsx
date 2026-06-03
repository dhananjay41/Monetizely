"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api/client";
import type { AvailabilityDTO, CatalogDTO } from "@/lib/api/dto";
import type { Availability, PricingModel } from "@prisma/client";
import {
  Banner,
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  TextInput,
} from "@/components/ui";

type CellState = {
  status: Availability;
  pricingModel: PricingModel;
  price: string; // kept as string for controlled input
};

const PRICING_LABEL: Record<PricingModel, string> = {
  FIXED: "Fixed $/mo",
  PER_SEAT: "$/seat/mo",
  PERCENT: "% of product",
};

function cellFromAvailability(a: AvailabilityDTO | undefined): CellState {
  return {
    status: a?.status ?? "NOT_AVAILABLE",
    pricingModel: a?.pricingModel ?? "FIXED",
    price: a?.price != null ? String(a.price) : "",
  };
}

export default function CatalogEditorPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const [catalog, setCatalog] = useState<CatalogDTO | null>(null);
  const [matrix, setMatrix] = useState<Record<string, CellState>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = (featureId: string, tierId: string) => `${featureId}:${tierId}`;

  const hydrate = useCallback((c: CatalogDTO) => {
    const next: Record<string, CellState> = {};
    for (const f of c.features) {
      for (const t of c.tiers) {
        const a = f.availabilities.find((x) => x.tierId === t.id);
        next[`${f.id}:${t.id}`] = cellFromAvailability(a);
      }
    }
    setCatalog(c);
    setMatrix(next);
  }, []);

  const load = useCallback(async () => {
    try {
      hydrate(await api.get<CatalogDTO>(`/api/products/${productId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    }
  }, [productId, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  function setCell(featureId: string, tierId: string, patch: Partial<CellState>) {
    setSaved(false);
    setMatrix((m) => ({ ...m, [key(featureId, tierId)]: { ...m[key(featureId, tierId)]!, ...patch } }));
  }

  async function addTier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    setBusy(true);
    try {
      await api.post(`/api/products/${productId}/tiers`, {
        name: String(data.get("name")),
        basePrice: Number(data.get("basePrice")),
      });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add tier");
    } finally {
      setBusy(false);
    }
  }

  async function addFeature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    setBusy(true);
    try {
      await api.post(`/api/products/${productId}/features`, {
        name: String(data.get("name")),
      });
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add feature");
    } finally {
      setBusy(false);
    }
  }

  async function saveMatrix() {
    if (!catalog) return;
    setError(null);
    setBusy(true);
    try {
      const cells = [];
      for (const f of catalog.features) {
        for (const t of catalog.tiers) {
          const cell = matrix[key(f.id, t.id)]!;
          if (cell.status === "ADDON") {
            const price = Number(cell.price);
            if (!cell.price || Number.isNaN(price) || price < 0) {
              throw new ApiError(
                `Enter a valid price for "${f.name}" on the ${t.name} tier`,
                400,
              );
            }
            cells.push({
              featureId: f.id,
              tierId: t.id,
              status: cell.status,
              pricingModel: cell.pricingModel,
              price,
            });
          } else {
            cells.push({ featureId: f.id, tierId: t.id, status: cell.status });
          }
        }
      }
      const updated = await api.put<CatalogDTO>(`/api/products/${productId}/matrix`, { cells });
      hydrate(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save matrix");
    } finally {
      setBusy(false);
    }
  }

  const readyToQuote = useMemo(
    () => !!catalog && catalog.tiers.length > 0,
    [catalog],
  );

  if (!catalog) {
    return (
      <div>
        {error ? <Banner>{error}</Banner> : <Card className="p-6 text-sm text-muted">Loading…</Card>}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={catalog.name}
        description="Define tiers, features, and the per-tier availability of each feature."
        action={
          readyToQuote ? (
            <Link
              href={`/quotes/new?productId=${catalog.id}`}
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Build a quote →
            </Link>
          ) : null
        }
      />

      {error ? (
        <div className="mb-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}
      {saved ? (
        <div className="mb-4">
          <Banner tone="success">Matrix saved.</Banner>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-medium">Tiers</h2>
          {catalog.tiers.length > 0 ? (
            <ul className="mb-4 space-y-1 text-sm">
              {catalog.tiers.map((t) => (
                <li key={t.id} className="flex justify-between border-b border-border py-1">
                  <span>{t.name}</span>
                  <span className="text-muted">${t.basePrice.toFixed(2)} / seat / mo</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">No tiers yet.</p>
          )}
          <form onSubmit={addTier} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Tier name">
                <TextInput name="name" placeholder="e.g. Growth" required />
              </Field>
            </div>
            <div className="w-32">
              <Field label="Base price">
                <TextInput name="basePrice" type="number" min="0" step="0.01" placeholder="50" required />
              </Field>
            </div>
            <Button type="submit" disabled={busy} variant="secondary">
              Add
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-medium">Features</h2>
          {catalog.features.length > 0 ? (
            <ul className="mb-4 space-y-1 text-sm">
              {catalog.features.map((f) => (
                <li key={f.id} className="border-b border-border py-1">
                  {f.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">No features yet.</p>
          )}
          <form onSubmit={addFeature} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Feature name">
                <TextInput name="name" placeholder="e.g. Single Sign-On (SSO)" required />
              </Field>
            </div>
            <Button type="submit" disabled={busy} variant="secondary">
              Add
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-medium">Feature matrix</h2>
            <p className="text-sm text-muted">
              For each feature in each tier, choose Included, Add-on, or Not available. Add-ons need
              a pricing model and value.
            </p>
          </div>
          <Button onClick={saveMatrix} disabled={busy || catalog.features.length === 0}>
            Save matrix
          </Button>
        </div>

        {catalog.features.length === 0 || catalog.tiers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Add at least one tier and one feature to edit the matrix.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface p-2 text-left font-medium">Feature</th>
                  {catalog.tiers.map((t) => (
                    <th key={t.id} className="min-w-[200px] p-2 text-left font-medium">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.features.map((f) => (
                  <tr key={f.id} className="border-t border-border align-top">
                    <td className="sticky left-0 bg-surface p-2 font-medium">{f.name}</td>
                    {catalog.tiers.map((t) => {
                      const cell = matrix[key(f.id, t.id)]!;
                      return (
                        <td key={t.id} className="p-2">
                          <MatrixCell
                            cell={cell}
                            onChange={(patch) => setCell(f.id, t.id, patch)}
                            testId={`cell-${f.name}-${t.name}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function MatrixCell({
  cell,
  onChange,
  testId,
}: {
  cell: CellState;
  onChange: (patch: Partial<CellState>) => void;
  testId: string;
}) {
  return (
    <div className="space-y-2" data-testid={testId}>
      <Select
        value={cell.status}
        onChange={(e) => onChange({ status: e.target.value as Availability })}
        aria-label="availability"
      >
        <option value="INCLUDED">Included</option>
        <option value="ADDON">Add-on</option>
        <option value="NOT_AVAILABLE">Not available</option>
      </Select>
      {cell.status === "ADDON" ? (
        <div className="flex gap-2">
          <Select
            value={cell.pricingModel}
            onChange={(e) => onChange({ pricingModel: e.target.value as PricingModel })}
            aria-label="pricing model"
            className="flex-1"
          >
            {(Object.keys(PRICING_LABEL) as PricingModel[]).map((m) => (
              <option key={m} value={m}>
                {PRICING_LABEL[m]}
              </option>
            ))}
          </Select>
          <TextInput
            type="number"
            min="0"
            step="0.01"
            value={cell.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder={cell.pricingModel === "PERCENT" ? "%" : "$"}
            aria-label="add-on value"
            className="w-24"
          />
        </div>
      ) : null}
    </div>
  );
}
