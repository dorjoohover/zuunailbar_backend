-- Migration: artist_leaves / branch_leaves хүснэгтүүдийг устгана.
--
-- ⚠️ ЗААВАЛ 2026_08_05_leaves_into_schedules_bookings.sql migration амжилттай
-- ажилласны ДАРАА, мөн availability_slots view-ийн гаралт (өнөөдрөөс 7-14
-- хоногийн цонхонд) шинэ болон хуучин схемийн хооронд зөрөөгүй болохыг
-- баталгаажуулсны дараа ЗӨВХӨН ГАРААР ажиллуулна уу. Prod дата рүү DROP
-- TABLE нэг удаа хийгдвэл буцаах боломжгүй тул автоматаар ажиллуулахгүй.

BEGIN;

DROP TABLE IF EXISTS "artist_leaves";
DROP TABLE IF EXISTS "branch_leaves";

COMMIT;
