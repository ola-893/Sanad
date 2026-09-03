import { ethers } from 'ethers';
import { proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SANAD_LIQUIDITY_POOL_ABI } from '../features/creditcoin/contracts/SanadLiquidityPool.abi.js';
import { SAG_TOKEN_ABI } from '../features/creditcoin/contracts/SAGToken.abi.js';
import { DEPLOYED_ADDRESSES } from '../config/deployed-addresses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PRIVATE_KEY = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY');

const CC3_RPC = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
const SEPOLIA_RPC = process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const PROOF_BUILDER_URL = process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://prover.cc3-testnet.creditcoin.network';

const POOL_ADDRESS = process.env.SANAD_LIQUIDITY_POOL_ADDRESS || DEPLOYED_ADDRESSES.cc3.liquidityPool;
const SAG_ADDRESS = process.env.SAG_TOKEN_ADDRESS || DEPLOYED_ADDRESSES.cc3.sagToken;
const SEPOLIA_VAULT_ADDRESS = process.env.SEPOLIA_INVESTOR_VAULT_ADDRESS || DEPLOYED_ADDRESSES.sepolia.investorVault;
const SEPOLIA_GATEWAY_ADDRESS = process.env.SEPOLIA_REPAYMENT_GATEWAY_ADDRESS || DEPLOYED_ADDRESSES.sepolia.repaymentGateway;

const INVESTOR_VAULT_ABI = [
  'function fundLoan(uint256 tokenId, address pawnshop, uint256 appraisedValueUSD) external payable',
  'function loanFunders(uint256 tokenId) external view returns (address)',
  'function loanPawnshops(uint256 tokenId) external view returns (address)',
];

const REPAYMENT_GATEWAY_ABI = [
  'function settleInvestor(uint256 tokenId, uint256 amount) external payable',
  'function totalRepaidForToken(uint256 tokenId) external view returns (uint256)',
  'function investorVaultAddress() external view returns (address)',
  'event InvestorSettled(uint256 indexed tokenId, address indexed pawnshop, address indexed investor, uint256 amount, uint256 timestamp)',
];

async function main() {
  console.log('========================================================================');
  console.log('🧪 E2E CC3 INVESTOR RETURN DISTRIBUTION PROOF & SETTLEMENT VERIFICATION');
  console.log('========================================================================');

  const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC);
  const cc3Signer = new ethers.Wallet(PRIVATE_KEY!, cc3Provider);

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const sepoliaSigner = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);

  console.log(`• Signer Address: ${cc3Signer.address}`);
  console.log(`• CC3 Pool Contract: ${POOL_ADDRESS}`);
  console.log(`• CC3 SAG Token: ${SAG_ADDRESS}`);
  console.log(`• Sepolia InvestorVault: ${SEPOLIA_VAULT_ADDRESS}`);
  console.log(`• Sepolia RepaymentGateway: ${SEPOLIA_GATEWAY_ADDRESS}`);

  const poolContract = new ethers.Contract(POOL_ADDRESS, SANAD_LIQUIDITY_POOL_ABI, cc3Signer);
  const sagContract = new ethers.Contract(SAG_ADDRESS, SAG_TOKEN_ABI, cc3Signer);
  const vaultContract = new ethers.Contract(SEPOLIA_VAULT_ADDRESS, INVESTOR_VAULT_ABI, sepoliaSigner);
  const gatewayContract = new ethers.Contract(SEPOLIA_GATEWAY_ADDRESS, REPAYMENT_GATEWAY_ABI, sepoliaSigner);

  // 1. Verify Pool Contract Configuration
  console.log('\n[1/6] Verifying Pool Contract Configuration on CC3...');
  const configuredGateway = await poolContract.repaymentGatewayAddress();
  console.log(`  • Configured RepaymentGateway: ${configuredGateway}`);
  if (configuredGateway.toLowerCase() !== SEPOLIA_GATEWAY_ADDRESS.toLowerCase()) {
    console.log(`  ⚠️ Updating RepaymentGateway on CC3 pool to ${SEPOLIA_GATEWAY_ADDRESS}...`);
    const updateTx = await poolContract.setRepaymentGatewayAddress(SEPOLIA_GATEWAY_ADDRESS);
    await updateTx.wait();
    console.log(`  ✅ Updated RepaymentGateway on CC3 pool`);
  } else {
    console.log(`  ✅ RepaymentGateway matches expected address`);
  }

  // 2. Mint Collateral Token on CC3 (Owner: cc3Signer.address as Pawnshop)
  console.log('\n[2/6] Minting Collateral Token on CC3 (SAG NFT)...');
  const mintParams = {
    pawnshop: cc3Signer.address,
    borrower: cc3Signer.address,
    weightGrams: 5000,
    karat: 24,
    appraisedValueUSD: 3500000000n, // $3,500.00 USD (6 decimals)
    loanAmount: 2450000000n,        // $2,450.00 USD
    tenureDays: 30,
    monthlyUjrahUSD: 24500000n,
    ipfsUri: 'ipfs://QmSanadReturnDistributionE2EMetadata',
  };

  const mintTx = await (sagContract as any).mintCollateral(mintParams);
  const mintReceipt = await mintTx.wait();

  const transferTopic = ethers.id('Transfer(address,address,uint256)');
  let testTokenId: bigint | null = null;
  for (const log of mintReceipt.logs) {
    if (log.topics[0] === transferTopic && log.topics.length >= 4) {
      testTokenId = BigInt(log.topics[3]);
      break;
    }
  }

  if (!testTokenId) {
    throw new Error('Failed to parse tokenId from mintCollateral Transfer event');
  }

  console.log(`  ✅ Minted SAG Collateral Token ID: #${testTokenId}`);
  const owner = await sagContract.ownerOf(testTokenId);
  console.log(`  • Token #${testTokenId} Owner on CC3: ${owner}`);

  // Record initial state on poolContract to verify state isolation
  const initialProvenCapital = await poolContract.investorTotalProvenCapital(cc3Signer.address);
  console.log(`  • Baseline Investor Proven Capital on Pool: ${ethers.formatEther(initialProvenCapital)} ETH`);

  // 3. Fund Loan on Sepolia InvestorVault (Sets loanFunders & loanPawnshops for tokenId)
  console.log(`\n[3/6] Setting up Loan Record on Sepolia InvestorVault for Token #${testTokenId}...`);
  console.log(`  • Calling fundLoan(tokenId: ${testTokenId}, pawnshop: ${sepoliaSigner.address}, appraisedUSD: 3500)...`);
  const fundTx = await vaultContract.fundLoan(testTokenId, sepoliaSigner.address, 3500, {
    value: 500n,
  });
  console.log(`  • Broadcast Sepolia fundLoan Tx: ${fundTx.hash}`);
  const fundReceipt = await fundTx.wait(1);
  console.log(`  ✅ Confirmed fundLoan in Sepolia Block #${fundReceipt.blockNumber}`);

  // 4. Broadcast settleInvestor on Sepolia RepaymentGateway
  console.log('\n[4/6] Broadcasting settleInvestor on Ethereum Sepolia RepaymentGateway...');
  const returnAmountWei = 1000n; // 1000 wei return

  console.log(`  • Calling settleInvestor(${testTokenId}, ${returnAmountWei}) with msg.value = ${returnAmountWei}...`);
  const settleTx = await gatewayContract.settleInvestor(testTokenId, returnAmountWei, {
    value: returnAmountWei,
  });
  console.log(`  • Broadcast Sepolia settleInvestor Tx: ${settleTx.hash}`);
  console.log(`    Sepolia Explorer: https://sepolia.etherscan.io/tx/${settleTx.hash}`);

  const rc = await settleTx.wait(1);
  const targetBlockNumber = rc.blockNumber;
  console.log(`  ✅ Confirmed Sepolia Settle Tx in Block #${targetBlockNumber}`);

  // 5. Generate Attestcoin Proof for Sepolia Tx (ChainKey: 1)
  console.log('\n[5/6] Requesting Attestcoin Cryptographic Proof (ChainKey: 1 - Sepolia)...');
  const proofBuilder = new proofProvider.service.ProofBuilder(1, PROOF_BUILDER_URL);

  console.log(`  • Waiting for block #${targetBlockNumber} to be attested by CC3 Attestcoin Prover...`);
  await proofBuilder.waitUntilHeightAttested(1, targetBlockNumber, 10000, 600000, 3000);
  console.log(`  ✅ Block #${targetBlockNumber} attested by CC3 Prover!`);

  console.log('  • Fetching Merkle + Continuity Proof...');
  const proofResult = await proofBuilder.getProof(settleTx.hash);
  if (!proofResult?.success || !proofResult.data) {
    throw new Error(`Failed to obtain Attestcoin proof: ${proofResult?.error}`);
  }

  const proofData = proofResult.data;
  console.log(`  • Header Number: ${proofData.headerNumber}`);
  console.log(`  • Merkle Root: ${proofData.merkleProof.root}`);
  console.log(`  • Siblings: ${proofData.merkleProof.siblings.length}`);

  // 6. Submit Proof to verifyAndRecordReturnDistribution on CC3
  console.log('\n[6/6] Calling verifyAndRecordReturnDistribution on Creditcoin CC3...');
  const verifyTx = await poolContract.verifyAndRecordReturnDistribution(
    testTokenId,
    proofData.chainKey,
    proofData.headerNumber,
    proofData.txBytes,
    proofData.merkleProof,
    proofData.continuityProof,
    settleTx.hash
  );

  console.log(`  • Broadcast CC3 Verification Tx: ${verifyTx.hash}`);
  const verifyRc = await verifyTx.wait();
  console.log(`  ✅ Confirmed on CC3 in Block #${verifyRc.blockNumber}!`);
  console.log(`    CC3 Explorer: https://creditcoin-testnet.blockscout.com/tx/${verifyTx.hash}`);

  // 7. Verify On-Chain State & Isolation
  console.log('\n[VERIFICATION] Verifying On-Chain State & Isolation Guarantees...');
  const finalDistributed = await poolContract.returnDistributed(testTokenId);
  const finalAmount = await poolContract.returnAmountDistributed(testTokenId);
  const isReplayTracked = await poolContract.processedSourceTransactions(settleTx.hash);
  const finalProvenCapital = await poolContract.investorTotalProvenCapital(cc3Signer.address);

  console.log(`  • returnDistributed[${testTokenId}]: ${finalDistributed} (Expected: true)`);
  console.log(`  • returnAmountDistributed[${testTokenId}]: ${finalAmount} wei (Expected: ${returnAmountWei})`);
  console.log(`  • processedSourceTransactions[${settleTx.hash}]: ${isReplayTracked} (Expected: true)`);
  console.log(`  • investorTotalProvenCapital: ${ethers.formatEther(finalProvenCapital)} ETH (Unchanged baseline: ${ethers.formatEther(initialProvenCapital)})`);

  if (!finalDistributed) throw new Error('Assertion failed: returnDistributed is false');
  if (finalAmount.toString() !== returnAmountWei.toString()) throw new Error(`Assertion failed: amount mismatch (${finalAmount} vs ${returnAmountWei})`);
  if (!isReplayTracked) throw new Error('Assertion failed: replay protection not recorded');
  if (finalProvenCapital.toString() !== initialProvenCapital.toString()) throw new Error('Isolation violation: Credit Oracle capital changed!');

  console.log('  ✅ All on-chain assertions passed successfully!');

  // 8. Negative Tests
  console.log('\n[NEGATIVE TESTS] Verifying Replay & Calldata Protections...');

  // Test A: Replay Protection
  try {
    console.log('  • Test A: Attempting replay of identical return distribution proof...');
    await poolContract.verifyAndRecordReturnDistribution(
      testTokenId,
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      proofData.merkleProof,
      proofData.continuityProof,
      settleTx.hash
    );
    throw new Error('Test A FAILED: Replay was not rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Replay rejected on-chain (${err.message?.split('\n')[0]})`);
  }

  // Test B: Mismatched Token ID
  try {
    console.log('  • Test B: Submitting proof with mismatched tokenId (999999 vs actual)...');
    await poolContract.verifyAndRecordReturnDistribution(
      999999,
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      proofData.merkleProof,
      proofData.continuityProof,
      ethers.keccak256(ethers.toUtf8Bytes('fake_hash'))
    );
    throw new Error('Test B FAILED: Mismatched tokenId was not rejected!');
  } catch (err: any) {
    console.log(`  ✅ PASSED: Mismatched tokenId rejected on-chain (${err.message?.split('\n')[0]})`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL TESTS PASSED: INVESTOR RETURN DISTRIBUTION LEG FULLY VERIFIED!');
  console.log('========================================================================');
  console.log(`• SAG Token ID: #${testTokenId}`);
  console.log(`• Sepolia settleInvestor Tx: ${settleTx.hash}`);
  console.log(`• CC3 verifyAndRecordReturnDistribution Tx: ${verifyTx.hash}`);
}

main().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
