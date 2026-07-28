const { Client } = require("pg");
const os = require("os");

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || "/tmp",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "zunailbar_pr",
    user: process.env.DB_USER || os.userInfo().username,
    password: process.env.DB_PASSWORD || undefined,
  });

  await client.connect();

  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'integration_payments'
          AND column_name = 'integration_id'
          AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE public.integration_payments
          ALTER COLUMN integration_id DROP NOT NULL;
      END IF;
    END $$;
  `);

  const { rows } = await client.query(`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'integration_payments'
      AND column_name = 'integration_id'
  `);

  console.log(rows[0]);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
