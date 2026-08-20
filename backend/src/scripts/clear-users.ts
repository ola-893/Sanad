/**
 * Clear all user data from the local dev database.
 * Run with: npx tsx src/scripts/clear-users.ts
 */
import { db } from '@/db/index.js';
import { sql } from 'drizzle-orm';

async function clearAllUserData() {
  console.log('🗑️  Clearing user data from the database...\n');

  try {
    // Count rows first
    const counts = await db.execute(sql`
      SELECT 
        (SELECT count(*) FROM main.user) as users,
        (SELECT count(*) FROM main.company_admin) as company_admins,
        (SELECT count(*) FROM main.super_admin) as super_admins,
        (SELECT count(*) FROM main.kyc_submission) as kyc,
        (SELECT count(*) FROM main.compliance_audit_log) as compliance_logs,
        (SELECT count(*) FROM main.creditcoin_audit_log) as creditcoin_logs
    `);
    const c = counts.rows[0] as any;
    console.log('  📊 Current data:');
    console.log(`     users: ${c.users}`);
    console.log(`     company_admins: ${c.company_admins}`);
    console.log(`     super_admins: ${c.super_admins}`);
    console.log(`     kyc_submissions: ${c.kyc}`);
    console.log(`     compliance_audit_logs: ${c.compliance_logs}`);
    console.log(`     creditcoin_audit_logs: ${c.creditcoin_logs}\n`);

    // Clear in dependency order
    await db.execute(sql`DELETE FROM main.compliance_audit_log`);
    console.log('  ✅ Cleared compliance_audit_log');

    await db.execute(sql`DELETE FROM main.creditcoin_audit_log`);
    console.log('  ✅ Cleared creditcoin_audit_log');

    await db.execute(sql`DELETE FROM main.kyc_submission`);
    console.log('  ✅ Cleared kyc_submission');

    await db.execute(sql`DELETE FROM main.super_admin`);
    console.log('  ✅ Cleared super_admin');

    await db.execute(sql`DELETE FROM main.company_admin`);
    console.log('  ✅ Cleared company_admin');

    await db.execute(sql`DELETE FROM main.user`);
    console.log('  ✅ Cleared user');

    console.log('\n🎉 All user data cleared!');
    console.log('   You can now register fresh wallet-based accounts.\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAllUserData();
