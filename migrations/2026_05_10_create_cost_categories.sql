-- Migration: create cost_categories table for top-level expense categories
-- (Хувьсах зардал, Үйл ажиллагааны зардал, маркетингийн зардал гэх мэт)

CREATE TABLE IF NOT EXISTS "cost_categories" (
  "id" UUID PRIMARY KEY,
  "name" TEXT NOT NULL,
  "merchant_id" UUID,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_categories_merchant
  ON "cost_categories" ("merchant_id");
CREATE INDEX IF NOT EXISTS idx_cost_categories_created_at
  ON "cost_categories" ("created_at");
