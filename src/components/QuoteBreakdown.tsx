import { formatUSD } from "@/lib/pricing/money";

/** Minimal shape a breakdown row needs — satisfied by both DTO and engine output. */
export interface BreakdownLine {
  kind: "BASE" | "ADDON" | "DISCOUNT";
  label: string;
  calculation: string;
  notes?: string | null;
  amount: number;
}

/**
 * Renders the line-item breakdown of a quote — each cost component, how it was
 * calculated, and the running totals. Shared by the live builder preview and
 * the final read-only quote view so the customer sees exactly what the analyst
 * saw.
 */
export function QuoteBreakdown({
  lineItems,
  subtotal,
  discountAmount,
  total,
}: {
  lineItems: BreakdownLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-medium">Line item</th>
            <th className="py-2 pr-4 font-medium">How it was calculated</th>
            <th className="py-2 pl-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i} className="border-b border-border align-top">
              <td className="py-3 pr-4">
                <div className="font-medium">{item.label}</div>
                {item.notes ? <div className="text-xs text-muted">{item.notes}</div> : null}
              </td>
              <td className="py-3 pr-4 text-muted">{item.calculation}</td>
              <td
                className={`py-3 pl-4 text-right tabular-nums ${
                  item.kind === "DISCOUNT" ? "text-green-700" : ""
                }`}
              >
                {formatUSD(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-sm">
            <td className="py-2 pr-4" />
            <td className="py-2 pr-4 text-right text-muted">Subtotal</td>
            <td className="py-2 pl-4 text-right tabular-nums">{formatUSD(subtotal)}</td>
          </tr>
          {discountAmount > 0 ? (
            <tr className="text-sm">
              <td className="py-1 pr-4" />
              <td className="py-1 pr-4 text-right text-muted">Discount</td>
              <td className="py-1 pl-4 text-right tabular-nums text-green-700">
                −{formatUSD(discountAmount)}
              </td>
            </tr>
          ) : null}
          <tr className="border-t-2 border-border text-base font-semibold">
            <td className="py-3 pr-4" />
            <td className="py-3 pr-4 text-right">Total</td>
            <td className="py-3 pl-4 text-right tabular-nums" data-testid="quote-total">
              {formatUSD(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
