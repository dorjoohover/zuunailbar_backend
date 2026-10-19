-- Migration: add `error` column to `message_logs`.
-- Зорилго: SMS илгээлт амжилтгүй болсон шалтгааныг (WeSend-ийн code: message)
-- хадгалж admin-ы SMS лог дээр харуулах. Амжилттай бол NULL.

ALTER TABLE message_logs
  ADD COLUMN IF NOT EXISTS error TEXT DEFAULT NULL;
