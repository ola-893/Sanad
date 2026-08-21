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
    fs.writeFileSync(frontendEnvPath, feContent, 'utf8');
    console.log(`  ✅ Updated ${frontendEnvPath} with new contract addresses.`);
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
