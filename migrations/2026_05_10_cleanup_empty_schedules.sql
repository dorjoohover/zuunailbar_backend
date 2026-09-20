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

-- 3) (REMOVED 2026-07-26) (user_id, index) дээрх unique constraint-ийг энд
--    нэмэхгүй болсон: 1) `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` нь
--    Postgres-д хүчингүй синтакс (энэ migration хэзээ ч амжилттай
--    ажиллаж байгаагүй, үргэлж syntax error-оор rollback хийдэг байсан);
--    2) 2026_07_26_schedules_date_based.sql-ээс хойш schedules нь долоо
--    хоног бүрт ижил `index`-тэй (өөр date-тэй) олон мөртэй байх нь хэвийн
--    тул (user_id, index) unique constraint нь шинэ загвартай зөрчилдөнө.
--    Оронд нь (user_id, date) partial unique index-г
--    2026_07_26_schedules_date_based.sql-д нэмсэн.

COMMIT;
