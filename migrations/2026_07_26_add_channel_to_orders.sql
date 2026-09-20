-- Migration: add `channel` column to `orders`.
-- Зорилго: Захиалга ямар суваг (channel)-аар үүссэнийг хадгалж,
-- цаашид channel-ээр шүүж хайх боломжтой болгох. Утга байхгүй бол NULL.
--
-- Анхааруулга: алдаа гарвал эхлээд `ROLLBACK;` ажиллуулж aborted транзакц-ыг
-- цэвэрлэсний дараа энэ скриптийг дахин ажиллуулна уу.

BEGIN;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT NULL;

COMMIT;
