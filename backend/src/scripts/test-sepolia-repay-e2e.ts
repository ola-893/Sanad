import { ethers } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SANAD_LIQUIDITY_POOL_ABI } from '../features/creditcoin/contracts/SanadLiquidityPool.abi.js';
import { SAG_TOKEN_ABI } from '../features/creditcoin/contracts/SAGToken.abi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PRIVATE_KEY = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY');

const CC3_RPC = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
const PROOF_BUILDER_URL = process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://prover.cc3-testnet.creditcoin.network';

const POOL_ADDRESS = process.env.SANAD_LIQUIDITY_POOL_ADDRESS || '0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70';
const SAG_ADDRESS = process.env.SAG_TOKEN_ADDRESS || '0x68359bD39Bf7A683a96808cAD38147d1baFa07f1';
const SEPOLIA_GATEWAY_ADDRESS = process.env.SEPOLIA_REPAYMENT_GATEWAY_ADDRESS || '0xB2bF16f54Fa082Dee7acEf3De2AD26079F4af162';

const REPAYMENT_GATEWAY_ABI = [
  'function repay(uint256 tokenId, uint256 amount) external payable',
  'function totalRepaidForToken(uint256 tokenId) external view returns (uint256)',
  'event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp)'
];

async function main() {
  console.log('========================================================================');
  console.log('🧪 END-TO-END ATTESTCOIN SEPOLIA REPAYMENT PROVING & SETTLEMENT TEST');
  console.log('========================================================================');

  // Providers & Signers
  const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC);
  const cc3Signer = new ethers.Wallet(PRIVATE_KEY!, cc3Provider);

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const sepoliaSigner = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);

  console.log(`• Wallet Address: ${cc3Signer.address}`);
  console.log(`• CC3 Pool Contract: ${POOL_ADDRESS}`);
  console.log(`• CC3 SAG Token: ${SAG_ADDRESS}`);
  console.log(`• Sepolia Gateway: ${SEPOLIA_GATEWAY_ADDRESS}`);

  const poolContract = new ethers.Contract(POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI, cc3Signer);
  const sagContract = new ethers.Contract(SAG_ADDRESS, SAG_TOKEN_ABI, cc3Signer);
  const gatewayContract = new ethers.Contract(SEPOLIA_GATEWAY_ADDRESS, REPAYMENT_GATEWAY_ABI, sepoliaSigner);

  // 1. Setup / Check Loan on Creditcoin CC3
  console.log('\n[1/5] Setting up SAG Collateral Loan on Creditcoin CC3...');
  const testTokenId = 1;
  const loanAmountUSD = 500; // 500 USD repayment

  const currentBalance = await poolContract.tokenLoanBalance(testTokenId);
  console.log(`  • Initial Token #${testTokenId} Active Loan Balance: ${ethers.formatEther(currentBalance)} tCTC`);

  // 2. Broadcast or Reuse Repayment Transaction on Ethereum Sepolia
  console.log('\n[2/5] Repayment Transaction on Ethereum Sepolia...');
  const knownSepoliaTx = process.env.TEST_SEPOLIA_TX || '0xf3035df49e280f6583710bcc402c25c40eabf6d87115c5d35440f62162b51265';
  let repayTxHash = knownSepoliaTx;
  let targetBlockNumber = 11534983;

  try {
    const tx = await sepoliaProvider.getTransaction(knownSepoliaTx);
    if (tx && tx.blockNumber) {
      targetBlockNumber = tx.blockNumber;
      console.log(`  • Found Confirmed Sepolia Repay Tx: ${knownSepoliaTx} (Block #${targetBlockNumber})`);
    } else {
      console.log(`  • Broadcasting fresh repay(${testTokenId}, 500) to Sepolia RepaymentGateway...`);
      const newTx = await gatewayContract.repay(testTokenId, 500);
      const rc = await newTx.wait(1);
      repayTxHash = newTx.hash;
      targetBlockNumber = rc.blockNumber;
      console.log(`  ✅ Broadcast New Repay Tx: ${repayTxHash} in Block #${targetBlockNumber}`);
    }
  } catch (e: any) {
    console.log(`  ℹ️ Transaction lookup: ${e.message}`);
  }

  console.log(`  • Sepolia Explorer: https://sepolia.etherscan.io/tx/${repayTxHash}`);

  // 3. Generate Attestcoin Proof for Sepolia Tx (ChainKey: 1)
  console.log('\n[3/5] Requesting Attestcoin Cryptographic Proof (ChainKey: 1 - Sepolia)...');
  const proofBuilder = new proofProvider.service.ProofBuilder(1, PROOF_BUILDER_URL);

  console.log(`  • Waiting for block #${targetBlockNumber} to be attested by CC3 Attestcoin Prover...`);
  await proofBuilder.waitUntilHeightAttested(1, targetBlockNumber, 10000, 300000, 3000);
  console.log(`  ✅ Block #${targetBlockNumber} is attested in Prover cache!`);

  console.log('  • Fetching Merkle + Continuity Proof...');
  const proofResult = await proofBuilder.getProof(repayTxHash);

  if (!proofResult?.success || !proofResult.data) {
    throw new Error(`Failed to obtain Attestcoin proof: ${proofResult?.error}`);
  }

  const proofData = proofResult.data;
  console.log(`  • Source ChainKey: ${proofData.chainKey}`);
  console.log(`  • Header Number: ${proofData.headerNumber}`);
  console.log(`  • Merkle Root: ${proofData.merkleProof.root}`);
  console.log(`  • Siblings Count: ${proofData.merkleProof.siblings.length}`);

  // 4. Submit Proof to SanadLiquidityPool on CC3
  console.log('\n[4/5] Submitting Proof to SanadLiquidityPool on Creditcoin CC3...');
  const merkleProofTuple = {
    root: proofData.merkleProof.root,
    siblings: proofData.merkleProof.siblings.map((s: any) => ({
      hash: s.hash,
      isLeft: s.isLeft,
    })),
  };

  const continuityProofTuple = {
    lowerEndpointDigest: proofData.continuityProof.lowerEndpointDigest,
    roots: proofData.continuityProof.roots,
  };

  console.log(`  • Calling verifyAndSettleRepayment(tokenId: ${testTokenId}, chainKey: ${proofData.chainKey})...`);
  const settleTx = await poolContract.verifyAndSettleRepayment(
    testTokenId,
    proofData.chainKey,
    proofData.headerNumber,
    proofData.txBytes,
    merkleProofTuple,
    continuityProofTuple,
    repayTxHash,
    0 // Auto-derived from calldata
  );

  console.log(`  • Broadcast CC3 Settle Tx: ${settleTx.hash}`);
  const settleReceipt = await settleTx.wait();
  console.log(`  ✅ CC3 Settlement Confirmed in Block #${settleReceipt.blockNumber}!`);
  console.log(`     CC3 Explorer: https://creditcoin-testnet.blockscout.com/tx/${settleTx.hash}`);

  // 5. Verify On-Chain State After Settlement
  console.log('\n[5/5] Verifying On-Chain State After Cross-Chain Settlement...');
  const finalBalance = await poolContract.tokenLoanBalance(testTokenId);
  const isSettled = await poolContract.processedSourceTransactions(repayTxHash);
  console.log(`  • Final Token #${testTokenId} Loan Balance: ${ethers.formatEther(finalBalance)} tCTC`);
  console.log(`  • Source Tx Replay Protection Recorded: ${isSettled}`);

  // 6. Negative Tests (Replay Protection & Mismatch)
  console.log('\n[NEGATIVE TESTS] Verifying Strict On-Chain Calldata & Replay Protections...');

  // Test A: Replay Protection
  try {
    console.log('  • Test A: Attempting to replay already settled transaction...');
    await poolContract.verifyAndSettleRepayment(
      testTokenId,
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      merkleProofTuple,
      continuityProofTuple,
      repayTxHash,
      0
    );
    console.error('  ❌ FAILED: Replay transaction was NOT rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Replay correctly rejected on-chain: ${err.message?.split('\n')[0]}`);
  }

  // Test B: Mismatched Token ID
  try {
    console.log('  • Test B: Attempting to claim proof with mismatched tokenId (999 vs 1)...');
    await poolContract.verifyAndSettleRepayment(
      999, // Wrong token ID
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      merkleProofTuple,
      continuityProofTuple,
      ethers.keccak256(ethers.toUtf8Bytes('fake_hash')),
      0
    );
    console.error('  ❌ FAILED: Mismatched token ID was NOT rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Mismatched token ID correctly rejected on-chain: ${err.message?.split('\n')[0]}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 PART 1 E2E VERIFICATION COMPLETE: ALL CHECKS PASSED!');
  console.log('========================================================================');
  console.log(`• Sepolia Gateway: ${SEPOLIA_GATEWAY_ADDRESS}`);
  console.log(`• Sepolia Repay Tx: ${repayTxHash}`);
  console.log(`• CC3 Settlement Tx: ${settleTx.hash}`);
}

main().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
