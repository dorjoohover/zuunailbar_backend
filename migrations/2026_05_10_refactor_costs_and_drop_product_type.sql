-- Migration: drop Product.type column, refactor `costs` to reference cost_categories.
--
-- Pre-requisite: 2026_05_10_create_cost_categories.sql (creates cost_categories table)
-- Notes:
--   * Existing data on `costs.product_id` / `costs.product_name` will be dropped.
--     Run the data-migration block at the bottom BEFORE the destructive part if you
--     need to keep historical entries — adjust to your real cost-types mapping.
--   * `products.type` is removed; cost-typed products are no longer represented in the
--     `products` table.

BEGIN;

-- 1) products: drop the `type` column
ALTER TABLE "products" DROP COLUMN IF EXISTS "type";

-- 2) costs: add cost_category_* columns
ALTER TABLE "costs"
  ADD COLUMN IF NOT EXISTS "cost_category_id" UUID,
  ADD COLUMN IF NOT EXISTS "cost_category_name" TEXT;

-- 3) (Optional) Backfill historical cost rows from the old product/category linkage.
--    Adjust this UPDATE if you want to remap old product_id / category_id values to
--    a cost_categories row. Default behaviour: leave NULL.
-- UPDATE "costs" c
--   SET "cost_category_id"   = cc."id",
--       "cost_category_name" = cc."name"
--   FROM "cost_categories" cc
--   WHERE cc."name" = c."product_name";

-- 4) costs: drop legacy product/category columns
ALTER TABLE "costs" DROP COLUMN IF EXISTS "product_id";
ALTER TABLE "costs" DROP COLUMN IF EXISTS "product_name";
ALTER TABLE "costs" DROP COLUMN IF EXISTS "category_id";

CREATE INDEX IF NOT EXISTS idx_costs_cost_category_id
  ON "costs" ("cost_category_id");

COMMIT;
