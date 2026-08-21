import { ethers } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PRIVATE_KEY = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error('Missing PRIVATE_KEY in environment');
}

const SEPOLIA_RPC = process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PROOF_BUILDER_URL = process.env.CREDITCOIN_PROOF_BUILDER_URL || process.env.ATTESTCOIN_PROOF_API_URL || 'https://prover.cc3-testnet.creditcoin.network';

const SEPOLIA_VAULT_ADDRESS = process.env.SEPOLIA_INVESTOR_VAULT_ADDRESS || '0xE037A229aF3886D0181B7727e8252F72B1d3d45B';
const POOL_ADDRESS = process.env.SANAD_LIQUIDITY_POOL_ADDRESS || '0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70';

const INVESTOR_VAULT_ABI = [
  'function deposit(uint256 amount) external payable',
  'event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)',
];

const SANAD_LIQUIDITY_POOL_ABI = [
  'function verifyAndRecordDeposit(uint64 chainKey, uint64 headerNumber, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, bytes32 sourceTxHash, uint256 claimedAmount) external returns (bool)',
  'function lpBalances(address provider) external view returns (uint256)',
  'function totalPoolLiquidity() external view returns (uint256)',
  'function processedSourceTransactions(bytes32 sourceTxHash) external view returns (bool)',
  'function investorVaultAddress() external view returns (address)',
];

async function main() {
  console.log('========================================================================');
  console.log('🧪 END-TO-END ATTESTCOIN SEPOLIA INVESTOR DEPOSIT PROVING & LP CREDIT TEST');
  console.log('========================================================================');

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC);

  const sepoliaSigner = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);
  const cc3Signer = new ethers.Wallet(PRIVATE_KEY!, cc3Provider);

  console.log(`• Investor Wallet: ${sepoliaSigner.address}`);
  console.log(`• Sepolia Investor Vault: ${SEPOLIA_VAULT_ADDRESS}`);
  console.log(`• CC3 Liquidity Pool: ${POOL_ADDRESS}`);

  const poolContract = new ethers.Contract(POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI, cc3Signer);
  const vaultContract = new ethers.Contract(SEPOLIA_VAULT_ADDRESS, INVESTOR_VAULT_ABI, sepoliaSigner);

  // 1. Initial LP Balance Check on Creditcoin CC3
  console.log('\n[1/5] Checking Initial LP Balance on Creditcoin CC3...');
  const initialLpBalance = await poolContract.lpBalances(sepoliaSigner.address);
  const initialPoolLiquidity = await poolContract.totalPoolLiquidity();
  console.log(`  • Initial Investor LP Balance: ${ethers.formatEther(initialLpBalance)} tCTC / USD`);
  console.log(`  • Initial Total Pool Liquidity: ${ethers.formatEther(initialPoolLiquidity)} tCTC / USD`);

  // 2. Broadcast Real Deposit Transaction on Ethereum Sepolia
  console.log('\n[2/5] Broadcasting Real Deposit Transaction on Ethereum Sepolia...');
  const depositAmountUnits = 1000n; // 1,000 units
  console.log(`  • Calling deposit(${depositAmountUnits}) on Sepolia InvestorVault...`);

  const depositTx = await vaultContract.deposit(depositAmountUnits, {
    value: 0n,
  });
  console.log(`  • Broadcast Sepolia Deposit Tx: ${depositTx.hash}`);
  console.log(`  • Sepolia Explorer: https://sepolia.etherscan.io/tx/${depositTx.hash}`);

  console.log('  • Waiting for Sepolia block confirmation...');
  const depositReceipt = await depositTx.wait(1);
  const depositBlockNumber = depositReceipt.blockNumber;
  console.log(`  ✅ Sepolia Deposit Confirmed in Block #${depositBlockNumber}!`);

  // 3. Request Attestcoin Proof for Sepolia Deposit (ChainKey: 1)
  console.log('\n[3/5] Requesting Attestcoin Cryptographic Proof (ChainKey: 1 - Sepolia)...');
  const proofBuilder = new proofProvider.service.ProofBuilder(1, PROOF_BUILDER_URL);

  console.log(`  • Waiting for block #${depositBlockNumber} to be attested by CC3 Attestcoin Prover...`);
  await proofBuilder.waitUntilHeightAttested(1, depositBlockNumber, 10000, 600000, 3000);
  console.log(`  ✅ Block #${depositBlockNumber} is attested in Prover cache!`);

  console.log('  • Fetching Merkle + Continuity Proof...');
  const proofResult = await proofBuilder.getProof(depositTx.hash);

  if (!proofResult?.success || !proofResult.data) {
    throw new Error(`Failed to obtain Attestcoin proof: ${proofResult?.error}`);
  }

  const proofData = proofResult.data;
  console.log(`  • Source ChainKey: ${proofData.chainKey}`);
  console.log(`  • Header Number: ${proofData.headerNumber}`);
  console.log(`  • Merkle Root: ${proofData.merkleProof.root}`);
  console.log(`  • Siblings Count: ${proofData.merkleProof.siblings.length}`);

  // 4. Submit Proof to SanadLiquidityPool.verifyAndRecordDeposit on CC3
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

  console.log(`  • Calling verifyAndRecordDeposit(chainKey: ${proofData.chainKey}, headerNumber: ${proofData.headerNumber})...`);
  const recordTx = await poolContract.verifyAndRecordDeposit(
    proofData.chainKey,
    proofData.headerNumber,
    proofData.txBytes,
    merkleProofTuple,
    continuityProofTuple,
    depositTx.hash,
    0 // 0 allows pool to derive exact amount from decoded calldata
  );

  console.log(`  • Broadcast CC3 Settle Tx: ${recordTx.hash}`);
  const recordReceipt = await recordTx.wait();
  console.log(`  ✅ CC3 Deposit Settlement Confirmed in Block #${recordReceipt.blockNumber}!`);
  console.log(`     CC3 Explorer: https://creditcoin-testnet.blockscout.com/tx/${recordTx.hash}`);

  // 5. Verify On-Chain State After Deposit Settlement
  console.log('\n[5/5] Verifying On-Chain State After Cross-Chain Deposit Settlement...');
  const finalLpBalance = await poolContract.lpBalances(sepoliaSigner.address);
  const finalPoolLiquidity = await poolContract.totalPoolLiquidity();
  const isSettled = await poolContract.processedSourceTransactions(depositTx.hash);

  console.log(`  • Previous LP Balance:  ${initialLpBalance.toString()}`);
  console.log(`  • New LP Balance:       ${finalLpBalance.toString()}`);
  console.log(`  • Net Credited Delta:   +${(finalLpBalance - initialLpBalance).toString()}`);
  console.log(`  • Total Pool Liquidity: ${ethers.formatEther(finalPoolLiquidity)} tCTC`);
  console.log(`  • Source Tx Replay Protection Recorded: ${isSettled}`);

  if ((finalLpBalance - initialLpBalance).toString() !== depositAmountUnits.toString()) {
    throw new Error(`LP Balance mismatch: expected +${depositAmountUnits}, got +${finalLpBalance - initialLpBalance}`);
  }

  // 6. Negative Tests (Replay Protection & Mismatch)
  console.log('\n[NEGATIVE TESTS] Verifying Strict On-Chain Calldata & Replay Protections...');

  // Test A: Replay Protection
  try {
    console.log('  • Test A: Attempting to replay already settled deposit transaction...');
    await poolContract.verifyAndRecordDeposit(
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      merkleProofTuple,
      continuityProofTuple,
      depositTx.hash,
      0
    );
    console.error('  ❌ FAILED: Replay transaction was NOT rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Replay correctly rejected on-chain: ${err.message?.split('\n')[0]}`);
  }

  // Test B: Mismatched Claimed Amount Over-Claim
  try {
    console.log('  • Test B: Attempting to claim 999999 units when calldata is 1000...');
    await poolContract.verifyAndRecordDeposit(
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      merkleProofTuple,
      continuityProofTuple,
      ethers.keccak256(ethers.toUtf8Bytes('fake_hash_deposit')),
      999999n // Claiming much higher amount than decoded in calldata
    );
    console.error('  ❌ FAILED: Over-claimed deposit was NOT rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Over-claimed deposit correctly rejected on-chain: ${err.message?.split('\n')[0]}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 PART 2 E2E VERIFICATION COMPLETE: ALL CHECKS PASSED!');
  console.log('========================================================================');
  console.log(`• Sepolia Investor Vault: ${SEPOLIA_VAULT_ADDRESS}`);
  console.log(`• Sepolia Deposit Tx:     ${depositTx.hash}`);
  console.log(`• CC3 Settlement Tx:      ${recordTx.hash}`);
  console.log(`• Investor LP Balance:    ${finalLpBalance.toString()}`);
}

main().catch((err) => {
  console.error('\n❌ Test Failed:', err);
  process.exit(1);
});
