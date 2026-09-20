-- Fix: TIME type-д "өдөр" гэсэн ойлголт байдаггүй тул LEAST(a.finish_time,
-- b.finish_time) нь шөнө дунд давсан (жишээ 00:30) артистын finish_time-г
-- үргэлж "хамгийн эрт" гэж буруу сонгодог байсан (00:30 < 21:00 гэх мэт).
-- Үүний улмаас тухайн өдрийн боломжит цагууд application (order.service.ts
-- getSlots) талд "тарах цагаас давсан" гэж буруу тооцогдож бүхэлдээ
-- алга болдог байв. Одоо STARTTIME(07:00)-с эрт finish_time-г дараагийн
-- өдрийн цаг гэж үзэж (+24ц) зөв дарааллаар харьцуулна.

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
    u.branch_id,
    d.date,
    d.weekday_index,
    t.t::time without time zone AS start_time,
    s.finish_time
  FROM days d
  JOIN schedules s
    ON s.index = d.weekday_index::numeric
   AND s.schedule_status = 10
  JOIN users u
    ON u.id::text = s.user_id::text
   AND u.user_status = 10
   AND u.status = 10
  CROSS JOIN LATERAL unnest(string_to_array(s.times::text, '|'::text)) t(t)
),
branch_schedules AS (
  SELECT
    b.branch_id,
    b.index AS weekday_index,
    MIN(t.t::time without time zone) AS open_time,
    MAX(t.t::time without time zone) AS close_time,
    b.finish_time
  FROM bookings b
  CROSS JOIN LATERAL unnest(string_to_array(b.times::text, '|'::text)) t(t)
  WHERE b.booking_status = 10
  GROUP BY b.id, b.branch_id, b.index, b.finish_time
),
artist_leaves AS (
  SELECT artist_leaves.artist_id, artist_leaves.date
  FROM public.artist_leaves
),
branch_leaves AS (
  SELECT branch_leaves.branch_id, branch_leaves.date
  FROM public.branch_leaves
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
 AND b.weekday_index = a.weekday_index
 AND a.start_time >= b.open_time
 AND (
   b.finish_time IS NOT NULL AND a.start_time < b.finish_time
   OR b.finish_time IS NULL AND a.start_time <= b.close_time
 )
LEFT JOIN artist_leaves al
  ON al.artist_id::text = a.artist_id::text
 AND al.date = a.date
LEFT JOIN branch_leaves bl
  ON bl.branch_id::text = a.branch_id::text
 AND bl.date = a.date
WHERE al.artist_id IS NULL
  AND bl.branch_id IS NULL;

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
