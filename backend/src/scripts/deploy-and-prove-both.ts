import { ethers } from 'ethers';
import { chainInfo, proofProvider } from '@gluwa/usc-sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { compileContracts } from './compile-contracts.js';

dotenv.config();

/**
 * ============================================================================
 * MULTI-CHAIN SANAD CREDIT ORACLE: DEPLOY & PROVE BOTH (SEPOLIA & MAINNET)
 * ============================================================================
 * 1. Compiles SanadCreditOracle.sol with multi-chain chainKey support.
 * 2. Deploys to Creditcoin CC3 Testnet.
 * 3. Submits real Sepolia proof (ChainKey 1) -> records CC3 settlement tx.
 * 4. Submits real Mainnet proof (ChainKey 3) -> records CC3 settlement tx.
 * 5. Verifies both credit profiles on-chain.
 * ============================================================================
 */
async function main() {
  console.log('================================================================');
  console.log('SANAD CREDIT ORACLE: MULTI-CHAIN DEPLOY & DUAL PROOF E2E TEST');
  console.log('================================================================\n');

  const privateKey = process.env.PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY;
  if (!privateKey) throw new Error('PRIVATE_KEY not found in environment.');

  const cc3Rpc = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
  const proofApiUrl = process.env.CREDITCOIN_PROOF_BUILDER_URL || 'https://prover.cc3-testnet.creditcoin.network';

  const cc3Provider = new ethers.JsonRpcProvider(cc3Rpc, 102031, {
    staticNetwork: ethers.Network.from(102031),
  });
  const relayerSigner = new ethers.Wallet(privateKey, cc3Provider);
  const balance = await cc3Provider.getBalance(relayerSigner.address);
  console.log(`• CC3 Relayer Signer: ${relayerSigner.address}`);
  console.log(`• tCTC Balance: ${ethers.formatEther(balance)} tCTC`);

  // 1. Compile contracts
  console.log('\n[1/4] Compiling SanadCreditOracle.sol (solc 0.8.20 / viaIR)...');
  const compiled = compileContracts();
  const oracleArtifact = compiled.SanadCreditOracle;

  // 2. Deploy to CC3
  console.log('\n[2/4] Deploying Multi-Chain SanadCreditOracle.sol to CC3 Testnet...');
  const factory = new ethers.ContractFactory(oracleArtifact.abi, oracleArtifact.bytecode, relayerSigner);
  const oracleContract = await factory.deploy();
  const deployTx = oracleContract.deploymentTransaction();
  console.log(`• Deploy Tx broadcast: ${deployTx?.hash}`);
  await oracleContract.waitForDeployment();
  const oracleAddress = await oracleContract.getAddress();
  console.log(`✅ SanadCreditOracle deployed at: ${oracleAddress}`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/address/${oracleAddress}`);

  // Verify supported chains on contract
  const isSepoliaSupported = await oracleContract.isSupportedChainKey(1);
  const isMainnetSupported = await oracleContract.isSupportedChainKey(3);
  console.log(`• ChainKey 1 (Sepolia) Supported on-chain: ${isSepoliaSupported ? 'YES ✅' : 'NO ❌'}`);
  console.log(`• ChainKey 3 (Mainnet) Supported on-chain: ${isMainnetSupported ? 'YES ✅' : 'NO ❌'}`);

  // 3. Test 1: Real Sepolia Proof (ChainKey 1)
  console.log('\n[3/4] Testing Real SEPOLIA Proof (ChainKey 1)...');
  const sepoliaTxHash = '0x8be105d96cd31b3ee5f7c301fd4f43b2c359b56a9964f47ea2a0d0195eb924a5';
  const sepoliaBorrower = '0xEbbAbB4087caA88086378147bF295C6F09857eea';
  
  console.log(`• Generating Attestcoin proof for Sepolia Tx: ${sepoliaTxHash}`);
  const sepoliaBuilder = new proofProvider.service.ProofBuilder(1, proofApiUrl);
  const sepoliaProofRes = await sepoliaBuilder.getProof(sepoliaTxHash);

  if (!sepoliaProofRes.success || !sepoliaProofRes.data) {
    throw new Error(`Failed to generate Sepolia proof: ${sepoliaProofRes.error}`);
  }

  const sepoliaProof = sepoliaProofRes.data;
  console.log(`  ✓ Sepolia Header Block: ${sepoliaProof.headerNumber}`);
  console.log(`  ✓ Merkle Siblings: ${sepoliaProof.merkleProof.siblings.length}`);
  console.log(`  ✓ Continuity Roots: ${sepoliaProof.continuityProof.roots.length}`);

  const sepoliaEventPayload = {
    sourceTxHash: sepoliaTxHash,
    protocol: 0, // AaveV3 (Sepolia Pool registered)
    eventType: 4, // ActiveBorrowPosition
    volumeUSD: ethers.parseUnits('30', 6), // $30 USDC
    timestamp: 1740000000,
  };

  console.log('• Submitting Sepolia proof to SanadCreditOracle on CC3...');
  const sepoliaSubTx = await (oracleContract as any).submitSingleProof(
    1, // ChainKey = 1 (Sepolia)
    sepoliaProof.headerNumber,
    sepoliaProof.txBytes,
    sepoliaProof.merkleProof,
    sepoliaProof.continuityProof,
    sepoliaBorrower,
    sepoliaEventPayload,
    '0x'
  );
  console.log(`• Sepolia Proof Broadcast Tx: ${sepoliaSubTx.hash}`);
  const sepoliaReceipt = await sepoliaSubTx.wait();
  console.log(`✅ Sepolia Event Proven on CC3! (Tx: ${sepoliaReceipt.hash})`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${sepoliaReceipt.hash}`);

  const sepoliaProfile = await oracleContract.getCreditProfile(sepoliaBorrower);
  console.log(`  • Sepolia Borrower Profile:`);
  console.log(`    - Score: ${sepoliaProfile.score.toString()}`);
  console.log(`    - Tier: ${['Unscored', 'Bronze', 'Silver', 'Gold', 'HighRisk'][Number(sepoliaProfile.tier)]}`);
  console.log(`    - Active Borrows Count: ${sepoliaProfile.activeBorrowCount.toString()}`);
  console.log(`    - Total Borrowed USD: $${ethers.formatUnits(sepoliaProfile.totalBorrowedUSD, 6)}`);

  // 4. Test 2: Real Mainnet Proof (ChainKey 3)
  console.log('\n[4/4] Testing Real MAINNET Proof (ChainKey 3)...');
  const mainnetTxHash = '0x0a597de623ef5ebcd0b99b861cf7a72a3f12658a6f1844ab6157a1b27bbd1079';
  const mainnetBorrower = '0x891775eDdcaBABdCE4b476E335a9EEF73123C75b';

  console.log(`• Generating Attestcoin proof for Mainnet Tx: ${mainnetTxHash}`);
  const mainnetBuilder = new proofProvider.service.ProofBuilder(3, proofApiUrl);
  const mainnetProofRes = await mainnetBuilder.getProof(mainnetTxHash);

  if (!mainnetProofRes.success || !mainnetProofRes.data) {
    throw new Error(`Failed to generate Mainnet proof: ${mainnetProofRes.error}`);
  }

  const mainnetProof = mainnetProofRes.data;
  console.log(`  ✓ Mainnet Header Block: ${mainnetProof.headerNumber}`);
  console.log(`  ✓ Merkle Siblings: ${mainnetProof.merkleProof.siblings.length}`);
  console.log(`  ✓ Continuity Roots: ${mainnetProof.continuityProof.roots.length}`);

  // Actual on-chain amount in tx: 3999.897791277453503796 USDe
  const mainnetEventPayload = {
    sourceTxHash: mainnetTxHash,
    protocol: 0, // AaveV3 (Mainnet Pool)
    eventType: 0, // CleanRepayment
    volumeUSD: 3999897791n, // $3,999.89 USD (6 decimals)
    timestamp: 1740000000,
  };

  console.log('• Submitting Mainnet proof to SanadCreditOracle on CC3...');
  const mainnetSubTx = await (oracleContract as any).submitSingleProof(
    3, // ChainKey = 3 (Mainnet)
    mainnetProof.headerNumber,
    mainnetProof.txBytes,
    mainnetProof.merkleProof,
    mainnetProof.continuityProof,
    mainnetBorrower,
    mainnetEventPayload,
    '0x'
  );
  console.log(`• Mainnet Proof Broadcast Tx: ${mainnetSubTx.hash}`);
  const mainnetReceipt = await mainnetSubTx.wait();
  console.log(`✅ Mainnet Event Proven on CC3! (Tx: ${mainnetReceipt.hash})`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${mainnetReceipt.hash}`);

  const mainnetProfile = await oracleContract.getCreditProfile(mainnetBorrower);
  console.log(`  • Mainnet Borrower Profile:`);
  console.log(`    - Score: ${mainnetProfile.score.toString()}`);
  console.log(`    - Tier: ${['Unscored', 'Bronze', 'Silver', 'Gold', 'HighRisk'][Number(mainnetProfile.tier)]}`);
  console.log(`    - Clean Repayment Count: ${mainnetProfile.cleanRepaymentCount.toString()}`);
  console.log(`    - Total Repaid USD: $${ethers.formatUnits(mainnetProfile.totalRepaidUSD, 6)}`);

  // 5. Update configuration files
  console.log('\nUpdating configuration files with new Oracle address...');
  updateOracleAddressInConfigs(oracleAddress);

  console.log('\n================================================================');
  console.log('🎉 SUMMARY OF DUAL PROOF VERIFICATION ON CC3');
  console.log('================================================================');
  console.log(`Oracle Address: ${oracleAddress}`);
  console.log(`Sepolia Settlement Tx (ChainKey 1): ${sepoliaReceipt.hash}`);
  console.log(`Mainnet Settlement Tx (ChainKey 3): ${mainnetReceipt.hash}`);
  console.log('================================================================\n');
}

function updateOracleAddressInConfigs(oracleAddress: string) {
  const rootDir = path.resolve(process.cwd());

  // 1. backend/.env
  const backendEnvPath = path.join(rootDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    let content = fs.readFileSync(backendEnvPath, 'utf8');
    if (content.includes('SANAD_CREDIT_ORACLE_ADDRESS=')) {
      content = content.replace(/SANAD_CREDIT_ORACLE_ADDRESS=.*/, `SANAD_CREDIT_ORACLE_ADDRESS="${oracleAddress}"`);
    } else {
      content += `\nSANAD_CREDIT_ORACLE_ADDRESS="${oracleAddress}"\n`;
    }
    fs.writeFileSync(backendEnvPath, content);
    console.log(`  ✓ Updated backend/.env`);
  }

  // 2. frontend/.env.local
  const frontendEnvPath = path.resolve(rootDir, '..', 'frontend', '.env.local');
  if (fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvPath, 'utf8');
    if (content.includes('NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS=')) {
      content = content.replace(/NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS=.*/, `NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS="${oracleAddress}"`);
    } else {
      content += `\nNEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS="${oracleAddress}"\n`;
    }
    fs.writeFileSync(frontendEnvPath, content);
    console.log(`  ✓ Updated frontend/.env.local`);
  }

  // 3. backend creditcoin.config.ts
  const backendConfigPath = path.join(rootDir, 'src', 'features', 'creditcoin', 'creditcoin.config.ts');
  if (fs.existsSync(backendConfigPath)) {
    let content = fs.readFileSync(backendConfigPath, 'utf8');
    content = content.replace(/creditOracleAddress: .*,/, `creditOracleAddress: process.env.SANAD_CREDIT_ORACLE_ADDRESS || '${oracleAddress}',`);
    fs.writeFileSync(backendConfigPath, content);
    console.log(`  ✓ Updated backend/src/features/creditcoin/creditcoin.config.ts`);
  }

  // 4. frontend sanad-credit-oracle.ts
  const feOraclePath = path.resolve(rootDir, '..', 'frontend', 'core', 'credit-bureau', 'sanad-credit-oracle.ts');
  if (fs.existsSync(feOraclePath)) {
    let content = fs.readFileSync(feOraclePath, 'utf8');
    content = content.replace(/process\.env\.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS \|\|\s*['"][0-9a-zA-Z]+['"]/, `process.env.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS || '${oracleAddress}'`);
    fs.writeFileSync(feOraclePath, content);
    console.log(`  ✓ Updated frontend/core/credit-bureau/sanad-credit-oracle.ts`);
  }
}

main().catch(console.error);
