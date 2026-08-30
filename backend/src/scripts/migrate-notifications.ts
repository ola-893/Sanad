import { pool } from '../db/index.js';

async function migrate() {
  console.log('[Migrate] Creating notifications table...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS main.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(40) NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON main.notifications(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON main.notifications(read)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON main.notifications(created_at DESC)`);

  console.log('[Migrate] Done. notifications table created.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migrate] Failed:', err);
  process.exit(1);
});
