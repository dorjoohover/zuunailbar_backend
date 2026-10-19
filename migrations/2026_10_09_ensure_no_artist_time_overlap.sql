-- Артистын цаг давхцахаас хамгаалах DB constraint байгаа эсэхийг баталгаажуулна.
-- (pg_restore / VPS шилжүүлэлтийн үед btree_gist байхгүйгээс constraint
-- алга болсон байж болзошгүй.)
--
-- 1) ЭХЛЭЭД одоо байгаа давхцлыг шалгана (мөр гарвал засаж/цуцалж байж 2-р алхам амжилттай болно):
--   SELECT a.user_id, a.nickname, a.order_date, a.order_id AS a_order, a.start_time AS a_start, a.end_time AS a_end,
--          b.order_id AS b_order, b.start_time AS b_start, b.end_time AS b_end
--     FROM order_details a
--     JOIN order_details b ON a.user_id = b.user_id AND a.id < b.id
--      AND tsrange(a.start_ts, a.end_ts) && tsrange(b.start_ts, b.end_ts)
--    WHERE a.status IN (10,20,40,70) AND b.status IN (10,20,40,70)
--      AND COALESCE(a.view_status,10) <> 30 AND COALESCE(b.view_status,10) <> 30
--    ORDER BY a.order_date DESC;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_artist_time_overlap'
  ) THEN
    ALTER TABLE public.order_details
      ADD CONSTRAINT no_artist_time_overlap
      EXCLUDE USING gist (user_id WITH =, tsrange(start_ts, end_ts) WITH &&)
      WHERE ((status = ANY (ARRAY[10, 20, 40, 70])) AND (view_status <> 30));
  END IF;
END $$;
