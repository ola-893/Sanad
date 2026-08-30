import { pool } from '../db/index.js';

async function migrate() {
  console.log('[Migrate] Adding v2 columns to pledge_request table...');

  // Borrower credit profile (auto-attached on creation)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS borrower_credit_score INTEGER DEFAULT 0`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS borrower_credit_tier VARCHAR(20) DEFAULT 'Unscored'`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS borrower_events JSONB DEFAULT '[]'`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS borrower_transaction_links JSONB DEFAULT '[]'`);

  // Gold images (uploaded by borrower)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS gold_images JSONB DEFAULT '[]'`);

  // Physical verification (pawnshop updates after meeting)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT ''`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verified_weight_g NUMERIC`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verified_karat INTEGER`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verified_purity NUMERIC`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS verified_appraised_value_usd NUMERIC`);

  // Payment tracking (pawnshop pays borrower after physical verification)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS payment_amount_usd NUMERIC`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(66)`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS payment_cc3_tx_hash VARCHAR(66)`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);

  // SAG minting (after payment)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS sag_token_id VARCHAR(40)`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS sag_minted_at TIMESTAMP`);

  // Pawnshop contact (shared with borrower after acceptance)
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS pawnshop_contact_name VARCHAR(100)`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS pawnshop_contact_phone VARCHAR(30)`);
  await pool.query(`ALTER TABLE main.pledge_request ADD COLUMN IF NOT EXISTS pawnshop_location TEXT`);

  console.log('[Migrate] Done. All v2 columns added to pledge_request.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migrate] Failed:', err);
  process.exit(1);
});
