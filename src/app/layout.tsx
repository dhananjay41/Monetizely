import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monetizely Quoting Tool",
  description: "Model SaaS pricing catalogs and produce shareable customer quotes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm text-primary-foreground">
                M
              </span>
              <span>Monetizely Quoting</span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/catalog"
                className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
              >
                Catalog
              </Link>
              <Link
                href="/quotes"
                className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
              >
                Quotes
              </Link>
              <Link
                href="/quotes/new"
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
              >
                New quote
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
