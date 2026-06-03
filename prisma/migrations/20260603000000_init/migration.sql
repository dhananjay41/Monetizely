-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('INCLUDED', 'ADDON', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'PER_SEAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "TermLength" AS ENUM ('MONTHLY', 'ANNUAL', 'TWO_YEAR');

-- CreateEnum
CREATE TYPE "LineItemKind" AS ENUM ('BASE', 'ADDON', 'DISCOUNT');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_availabilities" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "status" "Availability" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "pricingModel" "PricingModel",
    "price" DECIMAL(12,4),

    CONSTRAINT "feature_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "basePriceSnapshot" DECIMAL(12,2) NOT NULL,
    "seats" INTEGER NOT NULL,
    "term" "TermLength" NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "kind" "LineItemKind" NOT NULL,
    "label" TEXT NOT NULL,
    "calculation" TEXT NOT NULL,
    "notes" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tiers_productId_idx" ON "tiers"("productId");
CREATE UNIQUE INDEX "tiers_productId_name_key" ON "tiers"("productId", "name");

-- CreateIndex
CREATE INDEX "features_productId_idx" ON "features"("productId");
CREATE UNIQUE INDEX "features_productId_name_key" ON "features"("productId", "name");

-- CreateIndex
CREATE INDEX "feature_availabilities_tierId_idx" ON "feature_availabilities"("tierId");
CREATE UNIQUE INDEX "feature_availabilities_featureId_tierId_key" ON "feature_availabilities"("featureId", "tierId");

-- CreateIndex
CREATE INDEX "quotes_productId_idx" ON "quotes"("productId");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_idx" ON "quote_line_items"("quoteId");

-- AddForeignKey
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_availabilities" ADD CONSTRAINT "feature_availabilities_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_availabilities" ADD CONSTRAINT "feature_availabilities_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
