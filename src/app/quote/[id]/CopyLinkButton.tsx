"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Copies the current quote URL to the clipboard — the analyst's "share" action. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <Button variant="secondary" onClick={copy} type="button">
      {copied ? "Link copied ✓" : "Copy share link"}
    </Button>
  );
}
