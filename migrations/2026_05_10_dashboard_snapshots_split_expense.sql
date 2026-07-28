-- Migration: dashboard_snapshots-руу cost_total ба product_total багана нэмэх.
-- cost_total = costs.price нийлбэр, product_total = product_transactions.total_amount нийлбэр.
-- Хуучин 'expense' багана хэвээр үлдэх ба cost_total + product_total-н нийлбэрийг хадгална.

BEGIN;

ALTER TABLE "dashboard_snapshots"
  ADD COLUMN IF NOT EXISTS "cost_total"    NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "product_total" NUMERIC(18, 2) NOT NULL DEFAULT 0;

-- Сэргээх боломжтой backfill: expense өмнөх утгыг cost_total-руу хуулна
-- (нарийн задаргаа хэрэгтэй бол дашбоардаас "Snapshot шинэчлэх" дарж бүрэн дахин үүсгэнэ).
UPDATE "dashboard_snapshots"
   SET "cost_total" = "expense"
 WHERE "cost_total" = 0;

COMMIT;
