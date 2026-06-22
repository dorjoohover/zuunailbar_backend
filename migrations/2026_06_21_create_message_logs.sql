CREATE TABLE IF NOT EXISTS message_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      VARCHAR(20) NOT NULL,
  message     TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_logs_mobile ON message_logs (mobile);
