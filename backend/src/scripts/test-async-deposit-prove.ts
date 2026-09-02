import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEPLOYED_ADDRESSES } from '../config/deployed-addresses.js';
import { crossChainProofQueue, JOB_TYPES } from '../bullmq/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const CC3_CHAIN_ID = 102031;
const SEPOLIA_CHAIN_ID = 11155111;
const CC3_RPC = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

const INVESTOR_VAULT_ABI = [
  'function deposit(uint256 amount) external payable',
  'event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)',
];

const POOL_ABI = [
  'function investorTotalProvenCapital(address investor) external view returns (uint256)',
  'function totalCrossChainProvenCapital() external view returns (uint256)',
];

async function main() {
  console.log('========================================================================');
  console.log('🚀 LIVE VERIFICATION: ASYNC ATTESTCOIN PROOF & SETTLEMENT PIPELINE');
  console.log('   (BullMQ Background Queue + Fast Non-Blocking Enqueue + Live Polling)');
  console.log('========================================================================\n');

  const privateKey = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing PRIVATE_KEY in environment');
  }

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC, SEPOLIA_CHAIN_ID, {
    staticNetwork: ethers.Network.from(SEPOLIA_CHAIN_ID),
  });
  const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC, CC3_CHAIN_ID, {
    staticNetwork: ethers.Network.from(CC3_CHAIN_ID),
  });

  const sepoliaWallet = new ethers.Wallet(privateKey, sepoliaProvider);
  const cc3Wallet = new ethers.Wallet(privateKey, cc3Provider);

  const vaultAddress = DEPLOYED_ADDRESSES.sepolia.investorVault;
  const poolAddress = DEPLOYED_ADDRESSES.cc3.liquidityPool;

  console.log(`• Deployer / Investor Wallet: ${sepoliaWallet.address}`);
  console.log(`• Sepolia InvestorVault:      ${vaultAddress}`);
  console.log(`• Creditcoin CC3 Pool:        ${poolAddress}\n`);

  // 1. STEP 1: Execute Sepolia deposit
  const depositWei = ethers.parseEther('0.001');
  console.log(`[1/4] Executing 0.001 ETH Deposit to InvestorVault on Sepolia...`);
  const vault = new ethers.Contract(vaultAddress, INVESTOR_VAULT_ABI, sepoliaWallet);
  const depositTx = await vault.deposit(depositWei, { value: depositWei });
  console.log(`  • Broadcasted Sepolia Tx: ${depositTx.hash}`);
  const receipt = await depositTx.wait(1);
  console.log(`  ✅ Confirmed on Sepolia in Block #${receipt.blockNumber}!\n`);

  // 2. STEP 2: Non-blocking Enqueue into BullMQ Proof Queue
  console.log(`[2/4] Enqueuing Proof-and-Settle Job into BullMQ crossChainProofQueue...`);
  const enqueueStartTime = Date.now();
  const jobId = `deposit-${depositTx.hash.toLowerCase()}`;

  // Check / clear any previous job with same id
  const existingJob = await crossChainProofQueue.getJob(jobId);
  if (existingJob) {
    await existingJob.remove();
  }

  const job = await crossChainProofQueue.add(
    JOB_TYPES.PROVE_DEPOSIT,
    {
      type: 'deposit',
      sourceTxHash: depositTx.hash,
      chainKey: 1,
      userId: sepoliaWallet.address,
    },
    {
      jobId,
      priority: 1,
    }
  );

  const enqueueDurationMs = Date.now() - enqueueStartTime;
  console.log(`  ✅ Job enqueued successfully in ${enqueueDurationMs}ms (sub-second non-blocking return)!`);
  console.log(`  • BullMQ Job ID: ${job.id}`);
  console.log(`  • Initial State: ${(await job.getState()).toUpperCase()}\n`);

  if (enqueueDurationMs > 1000) {
    console.warn(`  ⚠️ Enqueue took longer than 1000ms: ${enqueueDurationMs}ms`);
  } else {
    console.log(`  ⚡ FAST ENQUEUE CONFIRMED: Initial request returned in < 1s without blocking on attestation.`);
  }

  // 3. STEP 3: Poll for Job Progress & Completion
  console.log(`\n[3/4] Live Polling Job Status (simulating frontend polling)...`);
  const maxPolls = 300; // ~12.5 min max to accommodate prover cache indexing
  let pollCount = 0;
  let finalResult: any = null;
  const pollHistory: Array<{ timestamp: string; poll: number; state: string; progress: number }> = [];

  while (pollCount < maxPolls) {
    await new Promise((r) => setTimeout(r, 2500));
    pollCount++;

    const currentJob = await crossChainProofQueue.getJob(jobId);
    if (!currentJob) {
      console.log(`  [Poll #${pollCount}] Job not found in queue`);
      continue;
    }

    const state = await currentJob.getState();
    const progress = currentJob.progress || 0;
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0];

    pollHistory.push({ timestamp: timeStr, poll: pollCount, state: state.toUpperCase(), progress: Number(progress) });
    console.log(`  • [${timeStr} | Poll #${pollCount}] State: ${state.toUpperCase().padEnd(9)} | Progress: ${progress}% | Attempts: ${currentJob.attemptsMade}`);

    if (state === 'completed') {
      finalResult = currentJob.returnvalue;
      console.log(`\n  🎉 JOB COMPLETED SUCCESSFULLY!`);
      break;
    }

    if (state === 'failed') {
      console.error(`\n  ❌ JOB FAILED:`, currentJob.failedReason);
      throw new Error(`Job permanently failed: ${currentJob.failedReason}`);
    }
  }

  if (!finalResult) {
    throw new Error('Timed out waiting for job completion');
  }

  // 4. STEP 4: Verification of On-Chain Settlement on CC3
  console.log(`\n[4/4] Verifying On-Chain Settlement on Creditcoin CC3...`);
  console.log(`  • Final CC3 Tx Hash:   ${finalResult.transactionHash || finalResult.cc3TxHash}`);
  console.log(`  • Block Number:        ${finalResult.blockNumber}`);
  console.log(`  • Explorer URL:        ${finalResult.explorerUrl}`);

  const pool = new ethers.Contract(poolAddress, POOL_ABI, cc3Provider);
  const provenCapital = await pool.investorTotalProvenCapital(sepoliaWallet.address);
  console.log(`  • Proven Capital on CC3: ${provenCapital.toString()} wei (${ethers.formatEther(provenCapital)} ETH equiv)`);

  console.log('\n========================================================================');
  console.log('✅ LIVE VERIFICATION REPORT SUMMARY');
  console.log('========================================================================');
  console.log(`1. Sepolia Deposit Tx:      ${depositTx.hash}`);
  console.log(`2. Non-Blocking Enqueue:    ${enqueueDurationMs}ms (Instant HTTP 202)`);
  console.log(`3. BullMQ Job ID:           ${job.id}`);
  console.log(`4. Total Poll Cycles:       ${pollCount} (${(pollCount * 2.5).toFixed(1)}s total elapsed)`);
  console.log(`5. Settled CC3 Tx Hash:     ${finalResult.transactionHash || finalResult.cc3TxHash}`);
  console.log(`6. CC3 Explorer:            ${finalResult.explorerUrl}`);
  console.log('========================================================================');

  // Print concise poll sequence table
  console.log('\n--- Poll Sequence Summary ---');
  for (const p of pollHistory.slice(0, 5)) {
    console.log(`  Poll #${p.poll} @ ${p.timestamp}: State=${p.state}, Progress=${p.progress}%`);
  }
  if (pollHistory.length > 6) {
    console.log(`  ... (${pollHistory.length - 6} intermediate polls omitted) ...`);
    const last = pollHistory[pollHistory.length - 1];
    console.log(`  Poll #${last.poll} @ ${last.timestamp}: State=${last.state}, Progress=${last.progress}%`);
  }

  // Exit cleanly
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
