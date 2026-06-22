-- Migration: profit-оос zardal-ыг (cost + product_transactions) хасах.
-- Шинэ томьёо: profit = revenue - salary
-- (Хуучин: profit = revenue - expense - salary)
--
-- Аль хэдийн хадгалагдсан dashboard_snapshots-ын profit утгуудыг шинэ томьёогоор
-- дахин тооцож шинэчилнэ.

UPDATE "dashboard_snapshots"
SET
  profit = (COALESCE(revenue, 0) - COALESCE(salary, 0)),
  updated_at = NOW();
