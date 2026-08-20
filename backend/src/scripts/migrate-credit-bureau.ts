/**
 * Migration: Add Attestcoin Protocol credit bureau columns to kyc_submission
 * Run: npx tsx src/scripts/migrate-credit-bureau.ts
 */
import { db } from '@/db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Adding Attestcoin credit bureau columns to kyc_submission...');

  const columns = [
    { name: 'ethereum_wallet_address', type: "varchar(46)" },
    { name: 'credit_score', type: "integer" },
    { name: 'credit_tier', type: "varchar(20)" },
    { name: 'attestcoin_proof_tx', type: "varchar(66)" },
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(
        `ALTER TABLE "main"."kyc_submission" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`
      ));
      console.log(`  ✅ Added column: ${col.name}`);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        console.log(`  ⏭️  Column ${col.name} already exists`);
      } else {
        console.error(`  ❌ Failed to add ${col.name}:`, err.message);
      }
    }
  }

  console.log('✅ Migration complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
