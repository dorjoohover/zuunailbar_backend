-- Migration: add `parent_id` (self-reference) to categories and cost_categories
-- 2 түвшний мод (parent → child).
-- `parent_id`-ийн төрлийг тухайн хүснэгтийн `id`-ийн төрлөөс автоматаар авна
-- (categories.id = varchar, cost_categories.id = uuid гэх мэт хольсон тохиолдол).
--
-- Анхааруулга: алдаа гарвал та эхлээд `ROLLBACK;` ажиллуулж aborted транзакц-ыг
-- цэвэрлэсний дараа энэ скриптийг дахин ажиллуулна уу.

ROLLBACK;

-- 1) categories
DO $$
DECLARE
  id_type text;
  has_col boolean;
BEGIN
  SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'categories'
      AND column_name = 'id';

  IF id_type IS NULL THEN
    RAISE NOTICE 'Table "categories" not found, skipping.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'categories'
      AND column_name = 'parent_id'
  ) INTO has_col;

  IF NOT has_col THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s NULL',
                   'categories', 'parent_id', id_type);
  END IF;
END $$;

ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS fk_categories_parent;
ALTER TABLE "categories"
  ADD CONSTRAINT fk_categories_parent
  FOREIGN KEY ("parent_id") REFERENCES "categories" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON "categories" ("parent_id");

-- 2) cost_categories
DO $$
DECLARE
  id_type text;
  has_col boolean;
BEGIN
  SELECT data_type INTO id_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'cost_categories'
      AND column_name = 'id';

  IF id_type IS NULL THEN
    RAISE NOTICE 'Table "cost_categories" not found, skipping.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'cost_categories'
      AND column_name = 'parent_id'
  ) INTO has_col;

  IF NOT has_col THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s NULL',
                   'cost_categories', 'parent_id', id_type);
  END IF;
END $$;

ALTER TABLE "cost_categories" DROP CONSTRAINT IF EXISTS fk_cost_categories_parent;
ALTER TABLE "cost_categories"
  ADD CONSTRAINT fk_cost_categories_parent
  FOREIGN KEY ("parent_id") REFERENCES "cost_categories" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_categories_parent_id
  ON "cost_categories" ("parent_id");
