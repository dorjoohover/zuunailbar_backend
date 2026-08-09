-- Migration: amралт (leave)-ыг тусдаа "artist_leaves" / "branch_leaves" хүснэгтээс
-- "schedules" / "bookings" руу шилжүүлнэ. "bookings"-ийг (салбарын нээлттэй цагийн
-- 7 хоногийн index-template) "schedules"-тэй ижил бодит огноон (date) дээр
-- суурилсан загвар руу шилжүүлнэ.
--
-- Зорилго (LEAVE_REFACTOR_PLAN.md-ийг үз):
--   * Артистын амралтыг schedules.leave_status/leave_description дээр шууд хадгална
--     (тусдаа "artist_leaves" хүснэгт, JOIN шаардлагагүй болно).
--   * Салбарын нээлттэй цагийг bookings.date дээр суурилсан болгож, салбарын
--     амралтыг bookings.is_leave/leave_description дээр шууд хадгална.
--   * Хуучин artist_leaves / branch_leaves өгөгдлийг шинэ баганад merge (backfill)
--     хийнэ — хүснэгтүүдийг энэ migration-д УСТГАХГҮЙ (үзнэ үү:
--     2026_08_05_drop_leave_tables.sql, тусад нь баталгаажсаны дараа ажиллуулна).
--   * availability_slots / availability_service_slots view-үүдийг leave-тэй холбоотой
--     LEFT JOIN-уудыг арилгаж, шинэ баганаар шүүх маягаар хялбарчилна.
--
-- Анхааруулга: алдаа гарвал эхлээд `ROLLBACK;` ажиллуулж aborted транзакц-ыг
-- цэвэрлэсний дараа энэ скриптийг дахин ажиллуулна уу. "bookings"-ийг date-based
-- болгох хэсэг (2-р алхам) хамгийн эрсдэлтэй тул staging DB дээр эхлээд
-- availability_slots-ийн гаралтыг migration-ийн өмнөх/дараах харьцуулж шалгана уу.

BEGIN;

-- ============================================================
-- 1) schedules: артистын амралтын багана
-- ============================================================
ALTER TABLE "schedules"
  ADD COLUMN IF NOT EXISTS "leave_status" SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS "leave_description" VARCHAR NULL;

COMMENT ON COLUMN "schedules"."leave_status" IS
  'NULL = амралтгүй. Бусад тохиолдолд EmployeeStatus enum-тэй ижил утга (жишээ: 20=DEKIRIT, 30=VACATION).';

-- ============================================================
-- 2) bookings: date-based болгох (schedules-ийн 2026_07_26 migration-той ижил pattern)
-- ============================================================
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "date" DATE,
  ADD COLUMN IF NOT EXISTS "is_generated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "source_booking_id" VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS "is_leave" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "leave_description" VARCHAR NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_source_booking_fk'
  ) THEN
    ALTER TABLE "bookings"
      ADD CONSTRAINT "bookings_source_booking_fk"
      FOREIGN KEY ("source_booking_id") REFERENCES "bookings"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

-- Одоо байгаа (branch_id, index) мөр бүрийг "энэ долоо хоног"-ийн харгалзах
-- бодит огноо болгож, admin-аас гараар тавьсан (is_generated=false) эх сурвалж
-- болгоно. Томьёо schedules migration-той ижил: 0=Даваа ... 6=Ням.
UPDATE "bookings"
SET "date" = (
  CURRENT_DATE
  - ((EXTRACT(DOW FROM CURRENT_DATE)::int + 6) % 7)
  + COALESCE("index", 0)::int
)
WHERE "date" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_bookings_branch_date_active"
  ON "bookings" ("branch_id", "date")
  WHERE "booking_status" = 10 AND "date" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_bookings_date_active"
  ON "bookings" ("date")
  WHERE "booking_status" = 10;

-- ============================================================
-- 3) Хуучин амралтуудыг merge хийх (backfill)
-- ============================================================

-- 3.1 artist_leaves -> schedules.leave_status / leave_description
--     Тухайн (artist_id, date) дээр идэвхтэй schedules мөр байгаа бол зөвхөн
--     leave талбаруудыг нь бичнэ.
UPDATE "schedules" s
SET "leave_status" = al."status",
    "leave_description" = al."description"
FROM "artist_leaves" al
WHERE s."user_id" = al."artist_id"
  AND s."date" = al."date"
  AND s."schedule_status" = 10;

-- Мөр байхгүй өдрүүдэд шинэ tombstone мөр үүсгэнэ (цагтай холбоогүй, зөвхөн
-- амралтыг тэмдэглэх зорилготой). "artist_leaves" дотор ижил (artist_id, date)
-- давхацсан мөр байж болзошгүй тул DISTINCT ON-оор нэг мөр л сонгоно (шинэ
-- created_at-тай нь давуу эрхтэй) — эс тэгвэл нэг INSERT дотор давхар мөр орж
-- unique index-тэй мөргөлдөнө.
INSERT INTO "schedules" (
  "id", "user_id", "approved_by", "branch_id", "date", "index",
  "schedule_status", "leave_status", "leave_description", "times",
  "is_generated", "source_schedule_id"
)
SELECT
  gen_random_uuid()::text,
  al."artist_id",
  al."created_by",
  u."branch_id",
  al."date",
  ((EXTRACT(DOW FROM al."date")::int + 6) % 7),
  10,
  al."status",
  al."description",
  NULL,
  false,
  NULL
FROM (
  SELECT DISTINCT ON ("artist_id", "date") *
  FROM "artist_leaves"
  WHERE "date" IS NOT NULL
  ORDER BY "artist_id", "date", "created_at" DESC NULLS LAST
) al
JOIN "users" u ON u."id"::text = al."artist_id"::text
WHERE NOT EXISTS (
  SELECT 1 FROM "schedules" s
  WHERE s."user_id" = al."artist_id" AND s."date" = al."date"
);

-- 3.2 branch_leaves -> bookings.is_leave / leave_description
UPDATE "bookings" b
SET "is_leave" = true,
    "leave_description" = bl."description"
FROM "branch_leaves" bl
WHERE b."branch_id" = bl."branch_id"
  AND b."date" = bl."date"
  AND b."booking_status" = 10;

-- "bookings.merchant_id" NOT NULL тул салбарын (branches.merchant_id) утгаас
-- шууд авна. branches-д харгалзах merchant олдохгүй (аль хэдийн байгаа booking
-- мөр ч байхгүй) мөрийг алгасна — ийм тохиолдол практикт байх ёсгүй, гэхдээ
-- migration бүхэлдээ бусад салбарын улмаас цуцлагдахаас сэргийлнэ.
-- "branch_leaves" дотор ижил (branch_id, date) давхацсан мөр байж болзошгүй
-- тул (артист леавтай ижил шалтгаанаар) DISTINCT ON-оор нэг мөр сонгоно.
INSERT INTO "bookings" (
  "id", "approved_by", "branch_id", "merchant_id", "date", "index",
  "booking_status", "is_leave", "leave_description", "times",
  "is_generated", "source_booking_id"
)
SELECT
  gen_random_uuid()::text,
  bl."created_by",
  bl."branch_id",
  COALESCE(
    br."merchant_id",
    (SELECT b2."merchant_id" FROM "bookings" b2 WHERE b2."branch_id" = bl."branch_id" AND b2."merchant_id" IS NOT NULL LIMIT 1)
  ),
  bl."date",
  ((EXTRACT(DOW FROM bl."date")::int + 6) % 7),
  10,
  true,
  bl."description",
  NULL,
  false,
  NULL
FROM (
  SELECT DISTINCT ON ("branch_id", "date") *
  FROM "branch_leaves"
  WHERE "date" IS NOT NULL
  ORDER BY "branch_id", "date", "created_at" DESC NULLS LAST
) bl
LEFT JOIN "branches" br ON br."id"::text = bl."branch_id"::text
WHERE NOT EXISTS (
    SELECT 1 FROM "bookings" b
    WHERE b."branch_id" = bl."branch_id" AND b."date" = bl."date"
  )
  AND COALESCE(
    br."merchant_id",
    (SELECT b2."merchant_id" FROM "bookings" b2 WHERE b2."branch_id" = bl."branch_id" AND b2."merchant_id" IS NOT NULL LIMIT 1)
  ) IS NOT NULL;

-- ============================================================
-- 4) VIEW-үүдийг дахин тодорхойлно: artist_leaves/branch_leaves JOIN-уудыг
--    арилгаж, schedules.leave_status IS NULL болон bookings.is_leave = false
--    нөхцөлөөр шүүнэ. branch_schedules CTE-г date-ээр (index-ээр биш) join
--    хийхээр өөрчилнө.
-- ============================================================
DROP VIEW IF EXISTS public.availability_service_slots;
DROP VIEW IF EXISTS public.availability_slots;

CREATE OR REPLACE VIEW public.availability_slots AS
WITH cfg AS (
  SELECT COALESCE(
    (
      SELECT app_config.value
      FROM app_config
      WHERE app_config.key = 'availability_days'::text
      LIMIT 1
    ),
    30
  ) AS days
),
days AS (
  SELECT
    d.d::date AS date,
    ((EXTRACT(dow FROM d.d) + 6::numeric) % 7::numeric)::integer AS weekday_index
  FROM cfg,
  LATERAL generate_series(
    CURRENT_DATE::timestamp without time zone,
    CURRENT_DATE + ((cfg.days || ' days'::text)::interval),
    '1 day'::interval
  ) d(d)
),
artist_schedules AS (
  SELECT
    s.user_id AS artist_id,
    COALESCE(s.branch_id, u.branch_id) AS branch_id,
    d.date,
    d.weekday_index,
    t.t::time without time zone AS start_time,
    s.finish_time
  FROM days d
  JOIN schedules s
    ON s.date = d.date
   AND s.schedule_status = 10
   AND s.leave_status IS NULL
  JOIN users u
    ON u.id::text = s.user_id::text
   AND u.user_status = 10
   AND u.status = 10
  CROSS JOIN LATERAL unnest(string_to_array(s.times::text, '|'::text)) t(t)
),
branch_schedules AS (
  SELECT
    b.branch_id,
    b.date,
    b.date AS weekday_date,
    MIN(t.t::time without time zone) AS open_time,
    MAX(t.t::time without time zone) AS close_time,
    b.finish_time
  FROM bookings b
  CROSS JOIN LATERAL unnest(string_to_array(b.times::text, '|'::text)) t(t)
  WHERE b.booking_status = 10
    AND b.is_leave = false
  GROUP BY b.id, b.branch_id, b.date, b.finish_time
)
SELECT
  a.artist_id,
  a.branch_id,
  a.date,
  a.start_time,
  CASE
    WHEN a.finish_time IS NOT NULL AND b.finish_time IS NOT NULL THEN
      CASE
        WHEN
          (EXTRACT(EPOCH FROM a.finish_time) + CASE WHEN a.finish_time < TIME '07:00' THEN 86400 ELSE 0 END)
          <=
          (EXTRACT(EPOCH FROM b.finish_time) + CASE WHEN b.finish_time < TIME '07:00' THEN 86400 ELSE 0 END)
        THEN a.finish_time
        ELSE b.finish_time
      END
    ELSE COALESCE(a.finish_time, b.finish_time)
  END AS finish_time
FROM artist_schedules a
JOIN branch_schedules b
  ON b.branch_id::text = a.branch_id::text
 AND b.date = a.date
 AND a.start_time >= b.open_time
 AND (
   b.finish_time IS NOT NULL AND a.start_time < b.finish_time
   OR b.finish_time IS NULL AND a.start_time <= b.close_time
 );

CREATE OR REPLACE VIEW public.availability_service_slots AS
WITH main_category AS (
  SELECT service_categories.id AS category_id
  FROM service_categories
  WHERE service_categories.main = true
  LIMIT 1
),
category_capacity AS (
  SELECT
    bs.branch_id,
    sv.category_id,
    max(bs.service_count) AS service_count
  FROM branch_services bs
  JOIN services sv
    ON sv.id::text = bs.service_id::text
  WHERE bs.status = 10
  GROUP BY bs.branch_id, sv.category_id
),
order_service_time AS (
  SELECT
    o.id AS order_id,
    o.branch_id,
    od.user_id AS artist_id,
    od.order_date,
    CASE
      WHEN count(*) > 1 AND bool_or(o.parallel = false) THEN mc.category_id::text
      ELSE min(sv.category_id::text)
    END AS category_id,
    min(od.start_ts) AS start_ts,
    CASE
      WHEN bool_or(o.parallel = true) THEN max(od.end_time)
      ELSE (min(od.start_ts) + sum((od.order_date + od.end_time) - od.start_ts))::time without time zone
    END AS end_time
  FROM order_details od
  JOIN orders o
    ON o.id::text = od.order_id::text
  JOIN services sv
    ON sv.id::text = od.service_id::text
  CROSS JOIN main_category mc
  WHERE od.status = ANY (ARRAY[10, 20, 40, 70])
    AND od.view_status = 10
  GROUP BY o.id, o.branch_id, od.user_id, od.order_date, mc.category_id
),
artist_end_time AS (
  SELECT
    order_service_time.branch_id,
    order_service_time.artist_id,
    order_service_time.order_date,
    order_service_time.category_id,
    order_service_time.start_ts,
    order_service_time.end_time
  FROM order_service_time
)
SELECT
  s.artist_id,
  s.branch_id,
  s.date,
  s.start_time,
  cc.category_id,
  cc.service_count AS total_capacity,
  count(ost.order_id) AS booked,
  GREATEST(cc.service_count - count(ost.order_id), 0::bigint) AS available,
  ae.end_time,
  s.finish_time
FROM availability_slots s
JOIN category_capacity cc
  ON cc.branch_id::text = s.branch_id::text
LEFT JOIN order_service_time ost
  ON ost.branch_id::text = s.branch_id::text
 AND ost.order_date = s.date
 AND ost.category_id = cc.category_id::text
 AND (s.date + s.start_time) < (s.date + ost.end_time)
 AND (s.date + s.start_time) >= ost.start_ts
LEFT JOIN artist_end_time ae
  ON ae.branch_id::text = s.branch_id::text
 AND ae.artist_id::text = s.artist_id::text
 AND ae.order_date = s.date
 AND ae.category_id = cc.category_id::text
 AND (s.date + s.start_time) < (s.date + ae.end_time)
 AND (s.date + s.start_time) >= ae.start_ts
GROUP BY
  s.artist_id,
  s.branch_id,
  s.date,
  s.start_time,
  cc.category_id,
  cc.service_count,
  ae.end_time,
  s.finish_time;

COMMIT;
