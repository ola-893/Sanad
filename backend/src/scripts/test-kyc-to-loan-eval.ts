import { db } from '@/db/index.js';
import { KycSubmission } from '@/features/kyc/kyc.model.js';
import { KycService } from '@/features/kyc/kyc.service.js';
import { callGoldEvaluator } from '@/util/gold-evaluator.js';
import { eq, sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function testKycToLoanEvaluation() {
  console.log('========================================================================');
  console.log('TEST: FETCHING STORED KYC RECORDS & PASSING TO GOLD EVALUATOR');
  console.log('========================================================================');

  // Ensure columns exist
  await db.execute(sql`
    ALTER TABLE main.kyc_submission 
    ADD COLUMN IF NOT EXISTS ethereum_wallet_address VARCHAR(46),
    ADD COLUMN IF NOT EXISTS credit_score INTEGER,
    ADD COLUMN IF NOT EXISTS credit_tier VARCHAR(20),
    ADD COLUMN IF NOT EXISTS attestcoin_proof_tx VARCHAR(66);
  `);

  const kycService = new KycService();

  // 1. Seed / Upsert Borrower A: Gold Tier
  const goldUserId = 'USR_BORROWER_GOLD_TEST';
  const goldWallet = '0x891775eDdcaBABdCE4b476E335a9EEF73123C75b';
  
  await db.delete(KycSubmission).where(eq(KycSubmission.userId, goldUserId));
  await db.insert(KycSubmission).values({
    userId: goldUserId,
    status: 'approved',
    riskScore: 10,
    amlStatus: 'clear',
    documentType: 'MyKad',
    ethereumWalletAddress: goldWallet,
    creditTier: 'Gold',
    creditScore: 820,
    attestcoinProofTx: '0x1c52da07284082a354c5c808d4bdf8dd2ed6071c2874ff5fb4ecbd997c519fc0'
  });

  // 2. Seed / Upsert Borrower B: Unscored Baseline
  const unscoredUserId = 'USR_BORROWER_UNSCORED_TEST';
  const unscoredWallet = '0x0000000000000000000000000000000000000001';

  await db.delete(KycSubmission).where(eq(KycSubmission.userId, unscoredUserId));
  await db.insert(KycSubmission).values({
    userId: unscoredUserId,
    status: 'approved',
    riskScore: 25,
    amlStatus: 'clear',
    documentType: 'MyKad',
    ethereumWalletAddress: unscoredWallet,
    creditTier: 'Unscored',
    creditScore: 500,
    attestcoinProofTx: ''
  });

  // Simulation function replicating sag.controller.ts logic
  async function simulateSagLoanAppraisal(userId: string, wallet: string, loanPrincipal: number, goldGrams: number, purity: number, tenorMonths: number) {
    const kycStatus = await kycService.getKycStatusByUserId(userId);
    let creditTier = 'Unscored';
    let creditScore = 500;

    if (kycStatus?.submission) {
      if (kycStatus.submission.creditTier) creditTier = kycStatus.submission.creditTier;
      if (kycStatus.submission.creditScore !== null && kycStatus.submission.creditScore !== undefined) {
        creditScore = kycStatus.submission.creditScore;
      }
    }

    const goldEvaluateJson = {
      principal_usd: loanPrincipal,
      gold_weight_g: goldGrams,
      purity: purity,
      tenure_days: tenorMonths * 30,
      borrower_address: wallet,
      credit_tier: creditTier as any,
      credit_score: creditScore,
    };

    console.log('\n------------------------------------------------------------------------');
    console.log(`SIMULATED CONTROLLER PAYLOAD for '${userId}':`);
    console.log(JSON.stringify(goldEvaluateJson, null, 2));

    const evalResult = await callGoldEvaluator(goldEvaluateJson);
    console.log(`\nEVALUATOR OUTPUT for '${userId}' (Tier: ${evalResult.metrics.credit_tier}, Score: ${evalResult.metrics.credit_score}):`);
    console.log(`  • Appraised Collateral Value: ${evalResult.metrics.collateral_value_usd.toFixed(2)} USD`);
    console.log(`  • Requested Loan Principal: ${evalResult.metrics.principal_usd.toFixed(2)} USD (${(evalResult.metrics.ltv * 100).toFixed(2)}% LTV)`);
    console.log(`  • Base Safe LTV: ${(evalResult.metrics.base_max_safe_ltv * 100).toFixed(1)}%`);
    console.log(`  • Credit Tier LTV Delta: ${(evalResult.metrics.credit_tier_ltv_delta >= 0 ? '+' : '')}${(evalResult.metrics.credit_tier_ltv_delta * 100).toFixed(1)}%`);
    console.log(`  • Max Allowable Safe LTV: ${(evalResult.metrics.max_safe_ltv * 100).toFixed(1)}%`);
    console.log(`  • Max Safe Loan Capacity: ${evalResult.metrics.max_recommended_loan_usd.toFixed(2)} USD`);
    console.log(`  • Recommendation Action: ${evalResult.recommendation.action.toUpperCase()}`);
    console.log(`  • Rationale: ${evalResult.recommendation.rationale}`);
    return { payload: goldEvaluateJson, result: evalResult };
  }

  // Identical collateral for both: 25g 22K (916 purity) gold, requested loan 5,500 USD, 3 months
  const goldRun = await simulateSagLoanAppraisal(goldUserId, goldWallet, 5500, 25, 916, 3);
  const unscoredRun = await simulateSagLoanAppraisal(unscoredUserId, unscoredWallet, 5500, 25, 916, 3);

  console.log('\n========================================================================');
  console.log('COMPARISON SUMMARY:');
  console.log('========================================================================');
  console.log(`Gold Tier Safe LTV:     ${(goldRun.result.metrics.max_safe_ltv * 100).toFixed(1)}% -> Max Loan: ${goldRun.result.metrics.max_recommended_loan_usd.toFixed(2)} USD`);
  console.log(`Unscored Base Safe LTV: ${(unscoredRun.result.metrics.max_safe_ltv * 100).toFixed(1)}% -> Max Loan: ${unscoredRun.result.metrics.max_recommended_loan_usd.toFixed(2)} USD`);
  console.log(`Net Borrowing Power Delta: +${(goldRun.result.metrics.max_recommended_loan_usd - unscoredRun.result.metrics.max_recommended_loan_usd).toFixed(2)} USD (+10.0% LTV boost for verified on-chain credit)`);
  process.exit(0);
}

testKycToLoanEvaluation().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
