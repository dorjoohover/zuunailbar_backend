# DB Migrations

Энэ сангийн SQL файлуудыг **дараалуулан** ажиллуулна. Файлын нэрэн дээрх огноо нь хийгдсэн дарааллыг илэрхийлдэг.

## Сүүлд нэмэгдсэн өөрчлөлтүүд (2026-05-10)

| # | Файл | Үйлчлэл |
|---|------|---------|
| 1 | `2026_05_10_create_cost_categories.sql` | Шинэ `cost_categories` table (top-level зардлын ангилал). |
| 2 | `2026_05_10_refactor_costs_and_drop_product_type.sql` | `products.type` багана хасах; `costs`-аас `product_id/product_name/category_id` хасч `cost_category_id`/`cost_category_name` нэмэх. |
| 3 | `2026_05_10_cleanup_empty_schedules.sql` | `schedules` table-аас хоосон/давхар мөрүүдийг устгаж `(user_id, index)` unique constraint оруулах. |
| 4 | `2026_05_10_product_transactions_date_and_drop_unit_price.sql` | `product_transactions`-руу `date` багана нэмэх; `unit_price`-г `price`-руу шилжүүлж устгах. |
| 5 | `2026_05_10_product_logs_drop_unit_price.sql` | `product_logs.unit_price`-ыг `price`-руу шилжүүлж устгах. |
| 6 | `2026_05_10_create_dashboard_snapshots.sql` | Шинэ `dashboard_snapshots` table болон `(date, COALESCE(branch_id::text, ''))` unique index. |
| 7 | `2026_05_10_dashboard_snapshots_split_expense.sql` | `dashboard_snapshots`-руу `cost_total`, `product_total` багана нэмэх + хуучин expense-ыг backfill хийх. |

## Ажиллуулах дараалал

Дээрх №1-ээс №7 хүртэл шууд жагсаалтын дарааллаар нь ажиллуул. №2 нь №1-ээс хамаардаг (cost_categories table эхэлж байх ёстой). №7 нь №6-ыг шаардана.

```bash
for f in migrations/2026_05_10_*.sql; do
  echo "→ $f"
  psql "$DATABASE_URL" -f "$f"
done
```

## Code-н тал

Migrations-ыг ажиллуулсны дараа Nest backend (port 5050)-ыг restart хий. `cost_category`, `dashboard` модуль шинэ endpoint-уудаар ажиллана.

## Manual backfill

`dashboard_snapshots`-ыг хуучин өгөгдлөөс дахин үүсгэхийг хүсвэл admin > Dashboard хуудаснаас **"Snapshot шинэчлэх"** товч дар. Огнооны хязгаар нь `Эхлэх огноо`/`Дуусах огноо`-той тааруулагдана. Захиалга байхгүй өдөрт ч costs/product_transactions-ийн дагуу snapshot бичигдэнэ.
