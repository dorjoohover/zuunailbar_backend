-- Migration: product_transactions table cleanup.
--   * `unit_price` багана хасагдсан — `price` нэгж үнийг хадгална.
--   * `date` багана нэмж захиалга хийсэн өдрийг ялгаатай хадгалах боломжтой болгоно.

BEGIN;

-- 1) date багана нэмэх (DATE, NULL зөвшөөрнө — урьд нь хадгалаагүй мөрнүүдийн хувьд created_at-ыг fallback болгоно).
ALTER TABLE "product_transactions"
  ADD COLUMN IF NOT EXISTS "date" DATE;

-- 2) Хуучин мөрүүдийн date-ыг created_at-аас бөглөнө.
UPDATE "product_transactions"
   SET "date" = COALESCE("date", ("created_at" AT TIME ZONE 'Asia/Ulaanbaatar')::date);

-- 3) unit_price багана байгаа бол price-руу шилжүүлээд устгана.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'product_transactions'
       AND column_name = 'unit_price'
  ) THEN
    UPDATE "product_transactions"
       SET "price" = COALESCE("price", "unit_price")
     WHERE "price" IS NULL OR "price" = 0;
    ALTER TABLE "product_transactions" DROP COLUMN "unit_price";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_transactions_date
  ON "product_transactions" ("date");

COMMIT;
