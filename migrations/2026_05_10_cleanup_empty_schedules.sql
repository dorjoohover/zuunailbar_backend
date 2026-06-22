-- Migration: cleanup orphan empty rows from `schedules`, then add uniqueness guard.
-- Booking/employee frontend дээр хоосон цаг хадгалах боломжийг блокласан;
-- DB талаас хог цэвэрлэж, цаашид (user_id, index) давхцлыг тэр чигт нь хаана.

BEGIN;

-- 1) Хоосон цагтай (NULL/empty/"|") schedule мөрүүдийг устгана.
DELETE FROM "schedules"
  WHERE "times" IS NULL
     OR "times" = ''
     OR "times" = '|';

-- 2) Нэг хэрэглэгчид ижил `index`-ээр давхцал байгаа бол хамгийн сүүлд үүсгэгдсэнийг үлдээнэ.
DELETE FROM "schedules" s
  USING "schedules" s2
  WHERE s."user_id" = s2."user_id"
    AND s."index"   = s2."index"
    AND s."created_at" < s2."created_at";

-- 3) Цаашдын давхцлыг бүрэн хаах unique constraint.
ALTER TABLE "schedules"
  ADD CONSTRAINT IF NOT EXISTS uq_schedules_user_index
    UNIQUE ("user_id", "index");

COMMIT;
