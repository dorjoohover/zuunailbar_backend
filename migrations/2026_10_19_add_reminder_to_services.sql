-- Migration: add `reminder` column to `services`.
-- Зорилго: Үйлчлүүлэгчийн сүүлийн захиалгаас N хоногийн (app_config.service_reminder_days,
-- default 28) дараа "үйлчилгээ авах хугацаа боллоо" SMS явуулах эсэхийг үйлчилгээ бүрээр тохируулна.
-- Default: true (бүх үйлчилгээнд сануулна).
--
-- Ерөнхий асаах/унтраах: app_config.service_reminder_enabled (1/0). Мөр байхгүй бол унтраалттай —
-- admin-ы "SMS лог" хуудаснаас асаана.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS reminder BOOLEAN NOT NULL DEFAULT TRUE;
