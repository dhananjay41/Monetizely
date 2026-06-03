import { expect, test } from "@playwright/test";

/**
 * End-to-end happy path required by the spec:
 *   1. Create a catalog entry (product → tier → feature → availability matrix)
 *   2. Build a quote from it
 *   3. View the saved, shareable quote
 *
 * The math is kept deliberately simple (monthly term, so no term discount) so
 * the expected total is obvious: 10 seats × $100 + $50 fixed add-on = $1,050.
 */
test("create a catalog, build a quote, and view it", async ({ page }) => {
  // Unique names so repeated runs against the same DB don't collide.
  const stamp = Date.now();
  const productName = `E2E Product ${stamp}`;
  const customerName = `E2E Customer ${stamp}`;
  const quoteName = `E2E Quote ${stamp}`;

  // --- 1. Create the catalog -------------------------------------------------
  await page.goto("/catalog");

  await page.getByPlaceholder("e.g. Analytics Suite").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();

  // Now on the product editor.
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  // Add a tier "Pro" at $100/seat/mo.
  await page.getByPlaceholder("e.g. Growth").fill("Pro");
  await page.getByPlaceholder("50").fill("100");
  await page.getByPlaceholder("50").press("Enter");
  await expect(page.getByText("$100.00 / seat / mo")).toBeVisible();

  // Add a feature "Premium Support".
  await page.getByPlaceholder("e.g. Single Sign-On (SSO)").fill("Premium Support");
  await page.getByPlaceholder("e.g. Single Sign-On (SSO)").press("Enter");

  // Configure the matrix cell: Premium Support on Pro = Add-on, fixed $50/mo.
  const cell = page.getByTestId("cell-Premium Support-Pro");
  await cell.getByLabel("availability").selectOption("ADDON");
  await cell.getByLabel("pricing model").selectOption("FIXED");
  await cell.getByLabel("add-on value").fill("50");
  await page.getByRole("button", { name: "Save matrix" }).click();
  await expect(page.getByText("Matrix saved.")).toBeVisible();

  // --- 2. Build the quote ----------------------------------------------------
  await page.getByRole("link", { name: /Build a quote/ }).click();
  await expect(page.getByRole("heading", { name: "Build a quote" })).toBeVisible();

  await page.getByPlaceholder("Acme Corp - Q3 2026 proposal").fill(quoteName);
  await page.getByPlaceholder("Acme Corporation").fill(customerName);

  // Monthly term keeps the math discount-free.
  await page.getByLabel("Term length").selectOption("MONTHLY");

  // Seats default to 10; set explicitly to be safe.
  await page.getByLabel("Seats", { exact: true }).fill("10");

  // Select the add-on.
  await page.getByTestId("addon-Premium Support").getByRole("checkbox").check();

  // The live preview total should settle on $1,050.00.
  await expect(page.getByTestId("quote-total")).toHaveText("$1,050.00");

  await page.getByRole("button", { name: "Save quote" }).click();

  // --- 3. View the saved quote ----------------------------------------------
  await expect(page).toHaveURL(/\/quote\/.+/);
  await expect(page.getByRole("heading", { name: quoteName })).toBeVisible();
  await expect(page.getByText(customerName)).toBeVisible();
  await expect(page.getByTestId("quote-total")).toHaveText("$1,050.00");

  // The shareable URL is the read-only document; reloading it still works.
  const url = page.url();
  await page.goto(url);
  await expect(page.getByTestId("quote-total")).toHaveText("$1,050.00");
});
