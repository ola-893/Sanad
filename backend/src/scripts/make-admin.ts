/**
 * Usage:
 *   npx tsx src/scripts/make-admin.ts 0xYourWalletAddress
 *
 * Promotes an existing user to SUPER_ADMIN role so they can access
 * the admin dashboard and pawnshop KYC approval endpoints.
 */
import 'dotenv/config';
import { db } from '@/db/index.js';
import { User } from '@/features/auth/auth.model.js';
import { eq } from 'drizzle-orm';

async function main() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.error('Usage: npx tsx src/scripts/make-admin.ts <walletAddress>');
    console.error('Example: npx tsx src/scripts/make-admin.ts 0xAbCd...1234');
    process.exit(1);
  }

  // Normalize to checksum address (simple uppercase/lowercase matching)
  const [user] = await db
    .select()
    .from(User)
    .where(eq(User.accountId, walletAddress))
    .limit(1);

  if (!user) {
    console.error(`❌ No user found with wallet address: ${walletAddress}`);
    console.error('');
    console.error('Make sure you have registered/login with this wallet first.');
    console.error('The user is created when you connect MetaMask and sign the login message.');
    process.exit(1);
  }

  console.log(`Found user: ${user.userId}`);
  console.log(`  Name: ${user.userFirstName} ${user.userLastName}`);
  console.log(`  Current role: ${user.roleId || 'BORROWER'}`);
  console.log(`  Wallet: ${user.accountId}`);

  if (user.roleId === 'SUPER_ADMIN') {
    console.log('');
    console.log('✅ This user is already SUPER_ADMIN.');
    process.exit(0);
  }

  await db
    .update(User)
    .set({ roleId: 'SUPER_ADMIN', updatedBy: 'make-admin-script' })
    .where(eq(User.userId, user.userId));

  console.log('');
  console.log('✅ Promoted to SUPER_ADMIN!');
  console.log('');
  console.log('You can now:');
  console.log('  1. Login at /login with your MetaMask wallet');
  console.log('  2. Access the admin dashboard at /admin/dashboard');
  console.log('  3. Approve/reject pawnshop KYC at /admin/kyc (Pawnshop KYC tab)');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
