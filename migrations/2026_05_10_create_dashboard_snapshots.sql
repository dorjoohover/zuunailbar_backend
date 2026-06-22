-- Migration: create dashboard_snapshots table
-- DashboardDao.upsert нь `(date, COALESCE(branch_id, ''))`-аар conflict шалгадаг тул
-- COALESCE expression дээр UNIQUE INDEX заавал шаардлагатай.

BEGIN;

CREATE TABLE IF NOT EXISTS "dashboard_snapshots" (
  "id"          UUID PRIMARY KEY,
  "date"        DATE NOT NULL,
  "branch_id"   UUID,
  "revenue"     NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "expense"     NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "salary"      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "profit"      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "order_count" INTEGER NOT NULL DEFAULT 0,
  "status"      SMALLINT NOT NULL DEFAULT 10,
  "created_by"  UUID,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ON CONFLICT (date, COALESCE(branch_id, ''))-д тохирох unique index.
-- branch_id NULL-тэй мөрнүүд (нийт салбарын нэгтгэл) ч давхцал гаргахгүйгээр хадгалагдана.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dashboard_snapshots_date_branch
  ON "dashboard_snapshots" ("date", COALESCE("branch_id"::text, ''));

-- Хайлтын flow-уудад туслах нэмэлт индекс.
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_date
  ON "dashboard_snapshots" ("date");
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_branch_id
  ON "dashboard_snapshots" ("branch_id");
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_status
  ON "dashboard_snapshots" ("status");

COMMIT;
