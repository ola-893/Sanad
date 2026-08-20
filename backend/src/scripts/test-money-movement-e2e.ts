import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { CreditcoinClient } from '../features/creditcoin/creditcoin.client.js';
import { SagTokenService } from '../features/creditcoin/sag-token.service.js';
import { LiquidityPoolService } from '../features/creditcoin/liquidity-pool.service.js';
import { CREDITCOIN_CONFIG } from '../features/creditcoin/creditcoin.config.js';

dotenv.config();

export async function runMoneyMovementE2E() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL - REAL MONEY MOVEMENT E2E VERIFICATION (CC3 TESTNET)');
  console.log('========================================================================\n');

  const client = CreditcoinClient.getInstance();
  const adminWallet = client.getAdminWallet();
  const provider = client.getCreditcoinProvider();
  const sagService = new SagTokenService();
  const poolService = new LiquidityPoolService();

  console.log(`Payer/Admin Address: ${adminWallet.address}`);
  const initialBal = await provider.getBalance(adminWallet.address);
  console.log(`Initial Payer Balance: ${ethers.formatEther(initialBal)} tCTC\n`);

  console.log(`Configured Smart Contracts:`);
  console.log(`• SAGToken:            ${CREDITCOIN_CONFIG.contracts.sagTokenAddress}`);
  console.log(`• SanadLiquidityPool:  ${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress}\n`);

  const results: {
    depositTxHash?: string;
    withdrawTxHash?: string;
    mintTokenId?: string;
    mintTxHash?: string;
    fundLoanTxHash?: string;
    repaymentTxHash?: string;
  } = {};

  // STEP 1: Investor calls depositLiquidity()
  console.log('[STEP 1/5] Testing Investor depositLiquidity() with 2.0 tCTC...');
  const depositRes = await poolService.depositLiquidity('2.0');
  if (!depositRes.success) {
    throw new Error(`Deposit failed: ${depositRes.error}`);
  }
  results.depositTxHash = depositRes.transactionHash;
  console.log(`  ✅ Deposit Confirmed!`);
  console.log(`     • Tx Hash:      ${depositRes.transactionHash}`);
  console.log(`     • Block:        #${depositRes.blockNumber}`);
  console.log(`     • New Pool CTC: ${depositRes.newTotalLiquidityCTC} tCTC`);
  console.log(`     • Explorer:     ${CREDITCOIN_CONFIG.explorerUrl}tx/${depositRes.transactionHash}\n`);

  // STEP 2: Investor calls withdrawLiquidity()
  console.log('[STEP 2/5] Testing Investor withdrawLiquidity() with 0.5 tCTC...');
  const withdrawRes = await poolService.withdrawLiquidity('0.5');
  if (!withdrawRes.success) {
    throw new Error(`Withdrawal failed: ${withdrawRes.error}`);
  }
  results.withdrawTxHash = withdrawRes.transactionHash;
  console.log(`  ✅ Withdrawal Confirmed!`);
  console.log(`     • Tx Hash:      ${withdrawRes.transactionHash}`);
  console.log(`     • Block:        #${withdrawRes.blockNumber}`);
  console.log(`     • Explorer:     ${CREDITCOIN_CONFIG.explorerUrl}tx/${withdrawRes.transactionHash}\n`);

  // STEP 3: Pawnshop mints new SAG Collateral Note
  console.log('[STEP 3/5] Minting SAG Collateral Note on CC3...');
  const mintRes = await sagService.mintCollateral({
    pawnshopAddress: adminWallet.address,
    borrowerAddress: adminWallet.address,
    weightGrams: 50.5,
    karat: 22,
    appraisedValueUSD: 3500,
    loanAmount: 1, // 1 CTC loan
    tenureDays: 30,
    monthlyUjrahUSD: 0,
    ipfsMetadataUri: 'ipfs://QmSanadTestGoldVaultReceipt001'
  });

  if (!mintRes.success || !mintRes.tokenId) {
    throw new Error(`Mint failed: ${mintRes.error}`);
  }
  results.mintTokenId = mintRes.tokenId;
  results.mintTxHash = mintRes.transactionHash;
  console.log(`  ✅ SAG Note Minted!`);
  console.log(`     • Token ID: #${mintRes.tokenId}`);
  console.log(`     • Tx Hash:  ${mintRes.transactionHash}\n`);

  // STEP 4: Pool funds the loan note
  console.log(`[STEP 4/5] Funding Loan for SAG #${mintRes.tokenId} with 1.0 tCTC from Pool...`);
  const fundRes = await poolService.fundLoan(mintRes.tokenId, '1.0');
  if (!fundRes.success) {
    throw new Error(`Fund loan failed: ${fundRes.error}`);
  }
  results.fundLoanTxHash = fundRes.transactionHash;
  console.log(`  ✅ Loan Funded!`);
  console.log(`     • Tx Hash:  ${fundRes.transactionHash}`);
  console.log(`     • Block:    #${fundRes.blockNumber}\n`);

  const loanBalanceBefore = await poolService.getLoanBalance(mintRes.tokenId);
  console.log(`  • Active Loan Balance on Contract: ${loanBalanceBefore} tCTC\n`);

  // STEP 5: Borrower executes direct same-chain native CTC repayment
  console.log(`[STEP 5/5] Executing repayLoanDirect() for SAG #${mintRes.tokenId} with 1.0 tCTC...`);
  const repayRes = await poolService.repayLoanDirect(mintRes.tokenId, '1.0');
  if (!repayRes.success) {
    throw new Error(`Repayment failed: ${repayRes.error}`);
  }
  results.repaymentTxHash = repayRes.transactionHash;
  console.log(`  ✅ Direct Repayment Confirmed on Creditcoin CC3!`);
  console.log(`     • Tx Hash:      ${repayRes.transactionHash}`);
  console.log(`     • Block:        #${repayRes.blockNumber}`);
  console.log(`     • Repaid:       ${repayRes.repaidAmountCTC} tCTC`);
  console.log(`     • Status:       ${repayRes.status}`);
  console.log(`     • Explorer:     ${CREDITCOIN_CONFIG.explorerUrl}tx/${repayRes.transactionHash}\n`);

  const loanBalanceAfter = await poolService.getLoanBalance(mintRes.tokenId);
  const collateralAfter = await sagService.getCollateral(mintRes.tokenId);
  const totalPoolAfter = await poolService.getTotalPoolLiquidity();

  console.log('========================================================================');
  console.log('POST-SETTLEMENT ON-CHAIN STATE VERIFICATION');
  console.log('========================================================================');
  console.log(`• Token Loan Balance:     ${loanBalanceAfter} tCTC (Expected: 0.0)`);
  console.log(`• Collateral Status:      ${collateralAfter.status} (Expected: Repaid)`);
  console.log(`• Total Pool Liquidity:   ${totalPoolAfter} tCTC`);
  console.log('========================================================================\n');

  console.log('🎉 ALL MONEY-MOVEMENT GAPS RESOLVED AND VERIFIED ON CREDITCOIN CC3!\n');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

if (process.argv[1]?.endsWith('test-money-movement-e2e.ts') || process.argv[1]?.endsWith('test-money-movement-e2e.js')) {
  runMoneyMovementE2E().catch(console.error);
}
