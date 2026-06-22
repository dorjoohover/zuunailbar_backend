-- Migration: product_logs.unit_price багана хасах.
-- Entity-аас хассан тул DB-аас ч салгана. Урьд нь хадгалагдсан утгуудыг `price`-руу шилжүүлнэ.
-- ProductTransaction.lastPurchasePrices одоохондоо unit_price-г унших боломжтой байсан тул
-- migration-ийг ажиллуулахаас өмнө backend code-ийг шинэчилсэн байх ёстой.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'product_logs'
       AND column_name = 'unit_price'
  ) THEN
    UPDATE "product_logs"
       SET "price" = COALESCE("price", "unit_price")
     WHERE "price" IS NULL OR "price" = 0;
    ALTER TABLE "product_logs" DROP COLUMN "unit_price";
  END IF;
END $$;

COMMIT;
