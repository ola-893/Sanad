import { pool } from '../db/index.js';

async function migrate() {
  console.log('[Migrate] Renaming price_per_gram_myr to price_per_gram_usd...');

  await pool.query(`ALTER TABLE main.gold_price RENAME COLUMN price_per_gram_myr TO price_per_gram_usd`);
  
  // Update any default values
  await pool.query(`COMMENT ON COLUMN main.gold_price.price_per_gram_usd IS 'Gold price in USD per gram'`);

  console.log('[Migrate] Done.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migrate] Failed:', err);
  process.exit(1);
});
