import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import solc from 'solc';
import { compileContracts } from './compile-contracts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

function findImports(importPath: string) {
  let fullPath: string;
  if (importPath.startsWith('@openzeppelin/')) {
    fullPath = path.resolve(rootDir, 'node_modules', importPath);
  } else {
    fullPath = path.resolve(rootDir, 'src', 'contracts', importPath);
  }
  try {
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch (e: any) {
    return { error: 'File not found: ' + fullPath + ' (' + e.message + ')' };
  }
}

function compileSepoliaContracts() {
  const sepoliaDir = path.resolve(rootDir, 'src', 'contracts', 'sepolia');

  const sources: Record<string, { content: string }> = {
    'InvestorVault.sol': { content: fs.readFileSync(path.join(sepoliaDir, 'InvestorVault.sol'), 'utf8') },
    'RepaymentGateway.sol': { content: fs.readFileSync(path.join(sepoliaDir, 'RepaymentGateway.sol'), 'utf8') },
  };

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === 'error');
    if (fatal.length > 0) throw new Error('Sepolia compilation failed: ' + fatal.map((e: any) => e.formattedMessage).join('\n'));
  }

  return {
    InvestorVault: output.contracts['InvestorVault.sol']['InvestorVault'],
    RepaymentGateway: output.contracts['RepaymentGateway.sol']['RepaymentGateway'],
  };
}

function getCommitHash(): string {
  try {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export async function deployAll() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL — FULL 5-CONTRACT DEPLOYMENT');
  console.log('  CC3: SAGToken, SanadLiquidityPool, SanadCreditOracle');
  console.log('  Sepolia: InvestorVault, RepaymentGateway');
  console.log('========================================================================\n');

  const privateKey = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
    console.error('❌ [DEPLOYMENT HALTED] Valid funded PRIVATE_KEY not found in backend/.env.');
    return { success: false, reason: 'MISSING_KEY' };
  }

  // === Providers & Signers ===
  const cc3Rpc = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
  const sepoliaRpc = process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

  const cc3Provider = new ethers.JsonRpcProvider(cc3Rpc, 102031, {
    staticNetwork: ethers.Network.from(102031),
  });
  const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);

  const cc3Signer = new ethers.Wallet(privateKey, cc3Provider);
  const sepoliaSigner = new ethers.Wallet(privateKey, sepoliaProvider);

  console.log(`Deployer Address: ${cc3Signer.address}`);

  const cc3Bal = await cc3Provider.getBalance(cc3Signer.address).catch(() => 0n);
  const sepoliaBal = await sepoliaProvider.getBalance(sepoliaSigner.address).catch(() => 0n);
  console.log(`• tCTC Balance (CC3):     ${ethers.formatEther(cc3Bal)} tCTC`);
  console.log(`• ETH Balance (Sepolia):  ${ethers.formatEther(sepoliaBal)} ETH`);

  if (cc3Bal === 0n) {
    console.error('\n❌ Account has 0 balance on Creditcoin 3 Testnet.');
    return { success: false, reason: 'ZERO_BALANCE_CC3' };
  }
  if (sepoliaBal === 0n) {
    console.error('\n❌ Account has 0 balance on Sepolia.');
    return { success: false, reason: 'ZERO_BALANCE_SEPOLIA' };
  }

  // === 1. Compile ===
  console.log('\n[1/6] Compiling CC3 Smart Contracts...');
  const cc3Compiled = compileContracts();

  console.log('\n[2/6] Compiling Sepolia Smart Contracts...');
  const sepoliaCompiled = compileSepoliaContracts();

  const results: Record<string, string> = {};

  // === 2. Deploy CC3 Contracts ===
  console.log('\n[3/6] Deploying CC3 Contracts...');

  // SanadCreditOracle
  console.log('  [3a] Deploying SanadCreditOracle...');
  const oracleFactory = new ethers.ContractFactory(cc3Compiled.SanadCreditOracle.abi, cc3Compiled.SanadCreditOracle.bytecode, cc3Signer);
  const oracleContract = await oracleFactory.deploy();
  await oracleContract.waitForDeployment();
  results.creditOracle = await oracleContract.getAddress();
  console.log(`  ✅ SanadCreditOracle: ${results.creditOracle}`);

  // SAGToken
  console.log('  [3b] Deploying SAGToken...');
  const sagFactory = new ethers.ContractFactory(cc3Compiled.SAGToken.abi, cc3Compiled.SAGToken.bytecode, cc3Signer);
  const sagContract = await sagFactory.deploy();
  await sagContract.waitForDeployment();
  results.sagToken = await sagContract.getAddress();
  console.log(`  ✅ SAGToken: ${results.sagToken}`);

  // SanadLiquidityPool
  console.log('  [3c] Deploying SanadLiquidityPool...');
  const poolFactory = new ethers.ContractFactory(cc3Compiled.SanadLiquidityPool.abi, cc3Compiled.SanadLiquidityPool.bytecode, cc3Signer);
  const poolContract = await poolFactory.deploy(results.sagToken);
  await poolContract.waitForDeployment();
  results.liquidityPool = await poolContract.getAddress();
  console.log(`  ✅ SanadLiquidityPool: ${results.liquidityPool}`);

  // Grant roles
  console.log('\n  Configuring CC3 AccessControl Roles...');
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  const tx1 = await (sagContract as any).grantRole(SETTLEMENT_ROLE, results.liquidityPool);
  await tx1.wait();
  console.log(`  ✅ Granted SETTLEMENT_ROLE to Pool (Tx: ${tx1.hash})`);

  const tx2 = await (sagContract as any).grantRole(MINTER_ROLE, cc3Signer.address);
  await tx2.wait();
  console.log(`  ✅ Granted MINTER_ROLE to Deployer (Tx: ${tx2.hash})`);

  const relayerAddress = process.env.RELAYER_WALLET_ADDRESS || '0x506e724d7FDdbF91B6607d5Af0700d385D952f8a';
  if (relayerAddress && ethers.isAddress(relayerAddress)) {
    const txRelayer = await (sagContract as any).grantRole(MINTER_ROLE, relayerAddress);
    await txRelayer.wait();
    console.log(`  ✅ Granted MINTER_ROLE to Relayer (${relayerAddress}) (Tx: ${txRelayer.hash})`);
  }

  // === 3. Deploy Sepolia Contracts ===
  console.log('\n[4/6] Deploying Sepolia Contracts...');

  // InvestorVault
  console.log('  [4a] Deploying InvestorVault...');
  const treasuryAddress = sepoliaSigner.address;
  const vaultFactory = new ethers.ContractFactory(
    sepoliaCompiled.InvestorVault.abi,
    '0x' + sepoliaCompiled.InvestorVault.evm.bytecode.object,
    sepoliaSigner
  );
  const vaultContract = await vaultFactory.deploy(treasuryAddress);
  await vaultContract.waitForDeployment();
  results.investorVault = await vaultContract.getAddress();
  console.log(`  ✅ InvestorVault: ${results.investorVault}`);

  // RepaymentGateway
  console.log('  [4b] Deploying RepaymentGateway...');
  const repayFactory = new ethers.ContractFactory(
    sepoliaCompiled.RepaymentGateway.abi,
    '0x' + sepoliaCompiled.RepaymentGateway.evm.bytecode.object,
    sepoliaSigner
  );
  const repayContract = await repayFactory.deploy(treasuryAddress, results.investorVault);
  await repayContract.waitForDeployment();
  results.repaymentGateway = await repayContract.getAddress();
  console.log(`  ✅ RepaymentGateway: ${results.repaymentGateway}`);

  // === 4. Wire Sepolia addresses into CC3 Pool ===
  console.log('\n[5/6] Wiring Sepolia addresses into CC3 Pool...');

  const gwTx = await (poolContract as any).setRepaymentGatewayAddress(results.repaymentGateway);
  await gwTx.wait();
  console.log(`  ✅ setRepaymentGatewayAddress(${results.repaymentGateway}) on CC3 Pool (Tx: ${gwTx.hash})`);

  const vaultTx = await (poolContract as any).setInvestorVaultAddress(results.investorVault);
  await vaultTx.wait();
  console.log(`  ✅ setInvestorVaultAddress(${results.investorVault}) on CC3 Pool (Tx: ${vaultTx.hash})`);

  // Seed baseline liquidity
  const depositAmount = ethers.parseEther('5.0');
  const depositTx = await (poolContract as any).depositLiquidity({ value: depositAmount });
  await depositTx.wait();
  console.log(`  ✅ Deposited 5.0 tCTC baseline liquidity (Tx: ${depositTx.hash})`);

  // === 5. Write deployed-addresses.ts ===
  console.log('\n[6/6] Writing deployed-addresses.ts (source of truth)...');

  const commitHash = getCommitHash();
  const deployedAt = new Date().toISOString();

  const addressFileContent = `/**
 * ============================================================================
 * DEPLOYED CONTRACT ADDRESSES — SINGLE SOURCE OF TRUTH
 * ============================================================================
 * Generated by: backend/src/scripts/deploy-all.ts
 *
 * Do NOT hardcode contract addresses elsewhere in the codebase.
 * Backend files: import { DEPLOYED_ADDRESSES } from '@/config/deployed-addresses.js';
 * Frontend files: update fallback values to match and add a comment pointing here.
 * Standalone scripts that cannot import: update hardcoded value and add a comment.
 * ============================================================================
 */

export const DEPLOYED_ADDRESSES = {
  // Creditcoin CC3 Testnet (Chain ID: 102031)
  cc3: {
    sagToken: '${results.sagToken}',
    liquidityPool: '${results.liquidityPool}',
    creditOracle: '${results.creditOracle}',
  },
  // Ethereum Sepolia Testnet (Chain ID: 11155111)
  sepolia: {
    investorVault: '${results.investorVault}',
    repaymentGateway: '${results.repaymentGateway}',
  },
  // Deployment metadata
  meta: {
    deployedAt: '${deployedAt}',
    commitHash: '${commitHash}',
    deployer: '${cc3Signer.address}',
  },
} as const;
`;

  const addressFilePath = path.resolve(rootDir, 'src/config/deployed-addresses.ts');
  fs.mkdirSync(path.dirname(addressFilePath), { recursive: true });
  fs.writeFileSync(addressFilePath, addressFileContent, 'utf8');
  console.log(`  ✅ Written: ${addressFilePath}`);

  // === Update .env ===
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const envUpdates: Record<string, string> = {
      SANAD_CREDIT_ORACLE_ADDRESS: results.creditOracle,
      SAG_TOKEN_ADDRESS: results.sagToken,
      SANAD_LIQUIDITY_POOL_ADDRESS: results.liquidityPool,
      SEPOLIA_INVESTOR_VAULT_ADDRESS: results.investorVault,
      SEPOLIA_REPAYMENT_GATEWAY_ADDRESS: results.repaymentGateway,
    };
    for (const [key, value] of Object.entries(envUpdates)) {
      const regex = new RegExp(`${key}=.*`, 'g');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`  ✅ Updated .env with all 5 contract addresses`);
  }

  // === Summary ===
  console.log('\n========================================================================');
  console.log('🎉 FULL 5-CONTRACT DEPLOYMENT COMPLETE');
  console.log('========================================================================');
  console.log(`  CC3 SanadCreditOracle:   ${results.creditOracle}`);
  console.log(`  CC3 SAGToken:            ${results.sagToken}`);
  console.log(`  CC3 SanadLiquidityPool:  ${results.liquidityPool}`);
  console.log(`  Sepolia InvestorVault:    ${results.investorVault}`);
  console.log(`  Sepolia RepaymentGateway: ${results.repaymentGateway}`);
  console.log(`  Commit: ${commitHash} | Deployed: ${deployedAt}`);
  console.log('========================================================================');

  return { success: true, results };
}

if (process.argv[1]?.endsWith('deploy-all.ts') || process.argv[1]?.endsWith('deploy-all.js')) {
  deployAll().catch(console.error);
}
