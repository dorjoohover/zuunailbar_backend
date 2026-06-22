-- Эхлээд аль аль хүснэгтийн id-ийн төрлийг шалга.
-- Үр дүн нь uuid эсвэл character varying (varchar) гарна.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('categories', 'cost_categories')
  AND column_name IN ('id', 'parent_id', 'merchant_id')
ORDER BY table_name, column_name;
