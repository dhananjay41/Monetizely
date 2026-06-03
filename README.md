# Monetizely Quoting Tool

A lightweight full-stack quoting application that lets an analyst define a client's SaaS pricing catalog and produce shareable, itemised customer quotes.

**Live (Vercel):** _[set after deploy]_  
**GitHub:** _[set after push]_

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Styling | Tailwind CSS v4 |
| Unit tests | Vitest |
| E2E test | Playwright |
| Deployment | Vercel |

---

## Running locally

### Prerequisites

- Node.js ≥ 20
- Docker (for the local Postgres instance)
- (Optional) `npx playwright install` for e2e tests

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd new-assignment
npm install

# 2. Start a local Postgres instance (Docker)
docker compose up -d

# 3. Create the database schema
npm run prisma:migrate

# 4. Seed the bundled "Acme Analytics" example catalog (optional)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` and update if your Postgres settings differ:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/monetizely?schema=public"
```

### Running unit tests

```bash
npm test
```

### Running the e2e test

```bash
# Ensure the DB is migrated, then:
npm run test:e2e
```

The e2e test starts a production build on port 3100 and walks through: creating a product, editing the feature matrix, building a quote, and viewing the shareable quote URL.

---

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project on Vercel.
3. Provision a Postgres database (Vercel Postgres / Neon) and copy the **pooled** connection string into the `DATABASE_URL` environment variable.
4. Vercel will run `npm run build` (which includes `prisma generate`) automatically.
5. After the first deploy, run the migration once:  
   `npx vercel env pull && npm run prisma:deploy`

---

## Assumptions

### Term discounts apply only to the base product price

The spec says "15%/25% discount on the per-seat price". Add-on prices (fixed, per-seat, and percent-based) are **not discounted** by the term length. The sample quote in `sample-quote.xlsx` confirms this — the SSO add-on is simply `$200 × 12 months` with no 15% deduction.

### Percent-of-product add-ons are applied to the discounted base

A PERCENT add-on (e.g. "10% of product cost") is calculated against the already-discounted base line amount, not the notional undiscounted price. Rationale: the base line *is* the product cost the customer pays; charging a percentage on top of an amount they aren't actually paying would overstate the add-on.

### Per-seat add-ons have their own independent seat count

The sample quote explicitly demonstrates this: a 25-seat deal with 5 seats of the API access add-on. Add-on seat counts are set separately per add-on in the quote builder.

### Overall quote discount applies to the subtotal

The percent discount is applied to the sum of the base and all add-on line items. This is the most natural interpretation and what the spec's sample quote implies ("apply a discount to the quote as a percentage").

### Quotes are immutable snapshots

Once saved, a quote stores its own copy of product name, tier name, base price, and fully-computed line items. Editing the catalog later does not change existing quotes.

### `validUntil` is 30 days after creation

The spec does not define a validity window. 30 days is a standard practice for sales proposals.

### No authentication

The spec explicitly asks for no login/multi-user system. The app is fully accessible without authentication. Shareable quote URLs are read-only by nature.

### USD only, no tax

Per the spec.

---

## Decisions

### PostgreSQL over SQLite / MongoDB

PostgreSQL gives precise `DECIMAL` types for financial data (no floating-point drift), strong transactional semantics for the matrix upsert, and deploys cleanly to Vercel Postgres / Neon. SQLite would require configuring Prisma's edge runtime adapter for Vercel; MongoDB lacks decimal-native types.

### Prisma ORM

The relational model fits naturally (product → tier / feature, with the `FeatureAvailability` junction table as the matrix cell). Prisma's generated client catches schema mismatches at compile time and its transaction API makes the all-or-nothing matrix save trivial.

### Immutable quote snapshots (denormalised)

Quotes store `productName`, `tierName`, `basePriceSnapshot`, and full line items. The alternative — recomputing at read time from live catalog data — means a catalog edit could silently change a quote the customer has already received.

### Pure pricing engine

`src/lib/pricing/engine.ts` is a zero-dependency pure function of `QuoteInput → PricedQuote`. It has no knowledge of Prisma, Next.js, or HTTP. This makes the math trivially unit-testable and reusable (the same function drives both the live preview endpoint and the save endpoint).

### Server-authoritative add-on pricing

The quote creation API resolves add-on prices from the catalog rather than accepting them from the client. This prevents a client from manipulating the quoted prices.

### Tailwind CSS v4

v4's `@import "tailwindcss"` / CSS-variable approach is cleaner than v3's class-heavy config for a relatively small UI.

---

## What I would build next

1. **Edit quotes / revision history** — create a new quote version rather than editing in place; display a "v2" badge and diff view.
2. **PDF export** — `@react-pdf/renderer` or a server-side puppeteer screenshot route; the quote page is already print-friendly.
3. **Auth & multi-tenancy** — NextAuth with organisation-scoped catalogs. Right now one catalog is shared globally.
4. **Quote status workflow** — Draft → Sent → Accepted / Declined, with timestamps.
5. **Delete / archive** for catalog items (currently create/edit only, per the spec).
6. **Webhooks / CRM integration** — fire a webhook when a quote is viewed or a status changes.
7. **Audit log** — who created/viewed which quote, when.

---

## Questions I would have asked

1. **Percent add-on base** — should the percentage be of the undiscounted list price, the discounted base, or the running subtotal (base + other add-ons already selected)? I chose discounted base; this choice is documented above.
2. **Term discount on add-ons** — should the 15%/25% term discount apply to per-seat add-ons? I assumed no (the spec says "discount on the per-seat *price*" of the product, and the sample quote confirms it).
3. **Quote validity** — is 30 days the right window, or is it configurable per-product?
4. **Multiple products per quote** — the spec describes one product per quote; just confirming that is intentional.
5. **Currency** — USD is explicit in the spec; confirming no multi-currency requirement in the near term.
