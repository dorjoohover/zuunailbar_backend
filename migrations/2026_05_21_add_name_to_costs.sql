-- Migration: add `name` column to `costs`.
-- Зорилго: Хэрэглээний зардал нэмэх үед чөлөөт нэр (тайлбар) оруулах боломжтой болгох.
--
-- Анхааруулга: алдаа гарвал эхлээд `ROLLBACK;` ажиллуулж aborted транзакц-ыг
-- цэвэрлэсний дараа энэ скриптийг дахин ажиллуулна уу.

BEGIN;

ALTER TABLE "costs"
  ADD COLUMN IF NOT EXISTS "name" TEXT;

COMMIT;
