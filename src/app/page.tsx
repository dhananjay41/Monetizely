import { Card, LinkButton } from "@/components/ui";

export default function HomePage() {
  return (
    <div>
      <section className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Quote your client&apos;s pricing</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Set up a client&apos;s product catalog — tiers, features, and add-on pricing — then build
          a customer quote with a fully itemised, shareable breakdown.
        </p>
        <div className="mt-5 flex gap-3">
          <LinkButton href="/catalog">Set up a catalog</LinkButton>
          <LinkButton href="/quotes/new" variant="secondary">
            Build a quote
          </LinkButton>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Step
          n={1}
          title="Define the catalog"
          body="Create a product, add its tiers and base prices, list features, and set how each feature behaves per tier — included, a paid add-on, or not available."
        />
        <Step
          n={2}
          title="Build a quote"
          body="Pick a product, tier, seats, and term length, choose add-ons, and apply an optional discount. The total updates live as you go."
        />
        <Step
          n={3}
          title="Share it"
          body="Saved quotes get their own read-only URL with a line-by-line breakdown of how every number was calculated."
        />
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {n}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </Card>
  );
}
