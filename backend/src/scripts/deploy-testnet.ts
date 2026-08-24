import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { compileContracts } from './compile-contracts.js';

dotenv.config();

export async function deployToTestnet() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL - CREDITCOIN 3 (CC3) TESTNET DEPLOYMENT');
  console.log('========================================================================\n');

  let privateKey = process.env.CREDITCOIN_PRIVATE_KEY;
  if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
    privateKey = process.env.PRIVATE_KEY;
  }
  if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
    console.error('❌ [DEPLOYMENT HALTED] Valid funded PRIVATE_KEY not found in backend/.env.');
    console.log('\nTo deploy live smart contracts to Creditcoin 3:');
    console.log('1. Set CREDITCOIN_PRIVATE_KEY or PRIVATE_KEY in backend/.env');
    console.log('2. Ensure account has tCTC on Creditcoin 3 Testnet (Chain ID 102031)');
    console.log('   Faucet: https://docs.creditcoin.org/wallets/using-testnet-faucet');
    return { success: false, reason: 'MISSING_KEY' };
  }

  const cc3Rpc = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';

  console.log('[1/4] Connecting to Creditcoin CC3 RPC...');
  console.log(`• Creditcoin 3 Testnet RPC: ${cc3Rpc}`);

  const cc3Provider = new ethers.JsonRpcProvider(cc3Rpc, {
    chainId: 102031,
    name: 'Creditcoin3Testnet',
  });

  const cc3Signer = new ethers.Wallet(privateKey, cc3Provider);

  console.log(`\nDeployer Address: ${cc3Signer.address}`);

  const cc3Bal = await cc3Provider.getBalance(cc3Signer.address).catch(() => 0n);

  console.log(`• tCTC Balance (Creditcoin CC3): ${ethers.formatEther(cc3Bal)} tCTC`);

  if (cc3Bal === 0n) {
    console.error('\n❌ Account has 0 balance on Creditcoin 3 Testnet. Cannot broadcast transactions.');
    return { success: false, reason: 'ZERO_BALANCE', address: cc3Signer.address };
  }

  console.log('\n[2/4] Compiling Smart Contracts (solc 0.8.20 / Cancun / viaIR)...');
  const compiled = compileContracts();

  const deploymentResults: {
    creditOracle?: string;
    sagToken?: string;
    liquidityPool?: string;
    depositTxHash?: string;
    depositedAmountCTC?: string;
  } = {};

  // 1. Deploy SanadCreditOracle on Creditcoin CC3
  console.log('\n[3/4-A] Deploying SanadCreditOracle.sol (with Token Decimals & Calldata Verification) to Creditcoin 3 Testnet...');
  const oracleFactory = new ethers.ContractFactory(compiled.SanadCreditOracle.abi, compiled.SanadCreditOracle.bytecode, cc3Signer);
  const oracleContract = await oracleFactory.deploy();
  console.log(`  • Broadcast Tx: ${oracleContract.deploymentTransaction()?.hash}`);
  await oracleContract.waitForDeployment();
  deploymentResults.creditOracle = await oracleContract.getAddress();
  console.log(`  ✅ SanadCreditOracle Deployed at: ${deploymentResults.creditOracle}`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.creditOracle}`);

  // 2. Deploy SAGToken on Creditcoin CC3
  console.log('\n[3/4-B] Deploying SAGToken.sol to Creditcoin 3 Testnet...');
  const sagFactory = new ethers.ContractFactory(compiled.SAGToken.abi, compiled.SAGToken.bytecode, cc3Signer);
  const sagContract = await sagFactory.deploy();
  console.log(`  • Broadcast Tx: ${sagContract.deploymentTransaction()?.hash}`);
  await sagContract.waitForDeployment();
  deploymentResults.sagToken = await sagContract.getAddress();
  console.log(`  ✅ SAGToken Deployed at: ${deploymentResults.sagToken}`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.sagToken}`);

  // 3. Deploy SanadLiquidityPool on Creditcoin CC3
  console.log('\n[3/4-C] Deploying SanadLiquidityPool.sol to Creditcoin 3 Testnet...');
  const poolFactory = new ethers.ContractFactory(
    compiled.SanadLiquidityPool.abi,
    compiled.SanadLiquidityPool.bytecode,
    cc3Signer
  );
  const poolContract = await poolFactory.deploy(deploymentResults.sagToken);
  console.log(`  • Broadcast Tx: ${poolContract.deploymentTransaction()?.hash}`);
  await poolContract.waitForDeployment();
  deploymentResults.liquidityPool = await poolContract.getAddress();
  console.log(`  ✅ SanadLiquidityPool Deployed at: ${deploymentResults.liquidityPool}`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.liquidityPool}`);

  // 4. Grant SETTLEMENT_ROLE & MINTER_ROLE on SAGToken to SanadLiquidityPool
  console.log('\n[3/4-D] Configuring AccessControl Roles on Creditcoin CC3...');
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  const tx1 = await (sagContract as any).grantRole(SETTLEMENT_ROLE, deploymentResults.liquidityPool);
  await tx1.wait();
  console.log(`  ✅ Granted SETTLEMENT_ROLE to SanadLiquidityPool (Tx: ${tx1.hash})`);

  const tx2 = await (sagContract as any).grantRole(MINTER_ROLE, cc3Signer.address);
  await tx2.wait();
  console.log(`  ✅ Granted MINTER_ROLE to Deployer (Tx: ${tx2.hash})`);

  // Set Sepolia RepaymentGateway and InvestorVault addresses if configured
  const sepoliaGateway = process.env.SEPOLIA_REPAYMENT_GATEWAY_ADDRESS || '0xB2bF16f54Fa082Dee7acEf3De2AD26079F4af162';
  if (sepoliaGateway) {
    const gwTx = await (poolContract as any).setRepaymentGatewayAddress(sepoliaGateway);
    await gwTx.wait();
    console.log(`  ✅ Configured Sepolia RepaymentGateway (${sepoliaGateway}) on SanadLiquidityPool (Tx: ${gwTx.hash})`);
  }

  const sepoliaVault = process.env.SEPOLIA_INVESTOR_VAULT_ADDRESS || '0xE037A229aF3886D0181B7727e8252F72B1d3d45B';
  if (sepoliaVault) {
    const vaultTx = await (poolContract as any).setInvestorVaultAddress(sepoliaVault);
    await vaultTx.wait();
    console.log(`  ✅ Configured Sepolia InvestorVault (${sepoliaVault}) on SanadLiquidityPool (Tx: ${vaultTx.hash})`);
  }

  // 5. Test Native CTC Deposit against new SanadLiquidityPool
  console.log('\n[4/4] Executing Real Native CTC Deposit against new SanadLiquidityPool...');
  const depositAmount = ethers.parseEther('5.0'); // 5 tCTC
  console.log(`  • Calling depositLiquidity() with ${ethers.formatEther(depositAmount)} tCTC value...`);
  const depositTx = await (poolContract as any).depositLiquidity({ value: depositAmount });
  console.log(`  • Broadcast Deposit Tx: ${depositTx.hash}`);
  const depositReceipt = await depositTx.wait();
  console.log(`  ✅ Deposit Confirmed in Block #${depositReceipt.blockNumber} (Tx: ${depositTx.hash})`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/tx/${depositTx.hash}`);

  deploymentResults.depositTxHash = depositTx.hash;
  deploymentResults.depositedAmountCTC = ethers.formatEther(depositAmount);

  const totalPoolLiquidity = await (poolContract as any).totalPoolLiquidity();
  const userLpBalance = await (poolContract as any).lpBalances(cc3Signer.address);
  console.log(`  • Contract totalPoolLiquidity: ${ethers.formatEther(totalPoolLiquidity)} tCTC`);
  console.log(`  • Deployer lpBalance:          ${ethers.formatEther(userLpBalance)} tCTC`);

  // Update .env file with new deployed addresses
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/SANAD_CREDIT_ORACLE_ADDRESS=.*/, `SANAD_CREDIT_ORACLE_ADDRESS="${deploymentResults.creditOracle}"`);
    envContent = envContent.replace(/SAG_TOKEN_ADDRESS=.*/, `SAG_TOKEN_ADDRESS="${deploymentResults.sagToken}"`);
    envContent = envContent.replace(/SANAD_LIQUIDITY_POOL_ADDRESS=.*/, `SANAD_LIQUIDITY_POOL_ADDRESS="${deploymentResults.liquidityPool}"`);
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`\n  ✅ Updated ${envPath} with new contract addresses.`);
  }

  // Update creditcoin.config.ts file with new deployed addresses
  const configPath = path.resolve(process.cwd(), 'src/features/creditcoin/creditcoin.config.ts');
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/creditOracleAddress: .*,/, `creditOracleAddress: process.env.SANAD_CREDIT_ORACLE_ADDRESS || '${deploymentResults.creditOracle}',`);
    configContent = configContent.replace(/sagTokenAddress: .*,/, `sagTokenAddress: process.env.SAG_TOKEN_ADDRESS || process.env.SAG_TOKEN_CONTRACT_ADDRESS || '${deploymentResults.sagToken}',`);
    configContent = configContent.replace(/liquidityPoolAddress: .*,/, `liquidityPoolAddress: process.env.SANAD_LIQUIDITY_POOL_ADDRESS || process.env.LIQUIDITY_POOL_CONTRACT_ADDRESS || '${deploymentResults.liquidityPool}',`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`  ✅ Updated ${configPath} with new fallback addresses.`);
  }

  // Update frontend .env.local if exists
  const frontendEnvPath = path.resolve(process.cwd(), '../frontend/.env.local');
  if (fs.existsSync(frontendEnvPath)) {
    let feContent = fs.readFileSync(frontendEnvPath, 'utf8');
    feContent = feContent.replace(/NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS=.*/, `NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS="${deploymentResults.creditOracle}"`);
    feContent = feContent.replace(/NEXT_PUBLIC_SAG_TOKEN_ADDRESS=.*/, `NEXT_PUBLIC_SAG_TOKEN_ADDRESS="${deploymentResults.sagToken}"`);
    feContent = feContent.replace(/NEXT_PUBLIC_SANAD_LIQUIDITY_POOL_ADDRESS=.*/, `NEXT_PUBLIC_SANAD_LIQUIDITY_POOL_ADDRESS="${deploymentResults.liquidityPool}"`);
    feContent = feContent.replace(/NEXT_PUBLIC_POOL_ADDRESS=.*/, `NEXT_PUBLIC_POOL_ADDRESS="${deploymentResults.liquidityPool}"`);
    fs.writeFileSync(frontendEnvPath, feContent, 'utf8');
    console.log(`  ✅ Updated ${frontendEnvPath} with new contract addresses.`);
  }

  // Update frontend contract helpers fallback addresses
  const feOraclePath1 = path.resolve(process.cwd(), '../frontend/core/credit-bureau/sanad-credit-oracle.ts');
  if (fs.existsSync(feOraclePath1)) {
    let content = fs.readFileSync(feOraclePath1, 'utf8');
    content = content.replace(/SANAD_CREDIT_ORACLE_ADDRESS =\s*process\.env\.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS \|\| '[^']+';/, `SANAD_CREDIT_ORACLE_ADDRESS =\n  process.env.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS || '${deploymentResults.creditOracle}';`);
    fs.writeFileSync(feOraclePath1, content, 'utf8');
    console.log(`  ✅ Updated ${feOraclePath1}`);
  }

  const feOraclePath2 = path.resolve(process.cwd(), '../frontend/lib/contracts/sanad-credit-oracle.ts');
  if (fs.existsSync(feOraclePath2)) {
    let content = fs.readFileSync(feOraclePath2, 'utf8');
    content = content.replace(/SANAD_CREDIT_ORACLE_ADDRESS =\s*process\.env\.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS \|\| '[^']+';/, `SANAD_CREDIT_ORACLE_ADDRESS =\n  process.env.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS || '${deploymentResults.creditOracle}';`);
    fs.writeFileSync(feOraclePath2, content, 'utf8');
    console.log(`  ✅ Updated ${feOraclePath2}`);
  }

  const fePoolPath = path.resolve(process.cwd(), '../frontend/lib/contracts/sanad-liquidity-pool.ts');
  if (fs.existsSync(fePoolPath)) {
    let content = fs.readFileSync(fePoolPath, 'utf8');
    content = content.replace(/'0x[0-9a-fA-F]{40}';\s*\n\s*export const SAG_TOKEN_ADDRESS/, `'${deploymentResults.liquidityPool}';\n\nexport const SAG_TOKEN_ADDRESS`);
    content = content.replace(/SAG_TOKEN_ADDRESS =\s*process\.env\.NEXT_PUBLIC_SAG_TOKEN_ADDRESS \|\|\s*'0x[0-9a-fA-F]{40}';/, `SAG_TOKEN_ADDRESS =\n  process.env.NEXT_PUBLIC_SAG_TOKEN_ADDRESS ||\n  '${deploymentResults.sagToken}';`);
    fs.writeFileSync(fePoolPath, content, 'utf8');
    console.log(`  ✅ Updated ${fePoolPath}`);
  }

  const beRelayerPath = path.resolve(process.cwd(), 'src/core/credit-bureau/attestcoin-oracle-relayer.service.ts');
  if (fs.existsSync(beRelayerPath)) {
    let content = fs.readFileSync(beRelayerPath, 'utf8');
    content = content.replace(/CREDITCOIN_CONFIG\.contracts\.creditOracleAddress \|\| '0x[0-9a-fA-F]{40}'/, `CREDITCOIN_CONFIG.contracts.creditOracleAddress || '${deploymentResults.creditOracle}'`);
    fs.writeFileSync(beRelayerPath, content, 'utf8');
    console.log(`  ✅ Updated ${beRelayerPath}`);
  }

  const beTestDepositPath = path.resolve(process.cwd(), 'src/scripts/test-sepolia-deposit-e2e.ts');
  if (fs.existsSync(beTestDepositPath)) {
    let content = fs.readFileSync(beTestDepositPath, 'utf8');
    content = content.replace(/SANAD_LIQUIDITY_POOL_ADDRESS \|\| '0x[0-9a-fA-F]{40}'/, `SANAD_LIQUIDITY_POOL_ADDRESS || '${deploymentResults.liquidityPool}'`);
    fs.writeFileSync(beTestDepositPath, content, 'utf8');
    console.log(`  ✅ Updated ${beTestDepositPath}`);
  }

  const beTestRepayPath = path.resolve(process.cwd(), 'src/scripts/test-sepolia-repay-e2e.ts');
  if (fs.existsSync(beTestRepayPath)) {
    let content = fs.readFileSync(beTestRepayPath, 'utf8');
    content = content.replace(/SANAD_LIQUIDITY_POOL_ADDRESS \|\| '0x[0-9a-fA-F]{40}'/, `SANAD_LIQUIDITY_POOL_ADDRESS || '${deploymentResults.liquidityPool}'`);
    content = content.replace(/SAG_TOKEN_ADDRESS \|\| '0x[0-9a-fA-F]{40}'/, `SAG_TOKEN_ADDRESS || '${deploymentResults.sagToken}'`);
    fs.writeFileSync(beTestRepayPath, content, 'utf8');
    console.log(`  ✅ Updated ${beTestRepayPath}`);
  }

  // Save results to summary
  console.log('\n========================================================================');
  console.log('FRESH DEPLOYMENT & LIVE NATIVE CTC DEPOSIT COMPLETE SUMMARY');
  console.log('========================================================================');
  console.log(JSON.stringify(deploymentResults, null, 2));

  return { success: true, deploymentResults };
}

if (process.argv[1]?.endsWith('deploy-testnet.ts') || process.argv[1]?.endsWith('deploy-testnet.js')) {
  deployToTestnet().catch(console.error);
}
