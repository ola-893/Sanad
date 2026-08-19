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

  console.log('[1/3] Connecting to Creditcoin CC3 RPC...');
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

  console.log('\n[2/3] Compiling Smart Contracts (solc 0.8.20 / Cancun / viaIR)...');
  const compiled = compileContracts();

  const deploymentResults: {
    sagToken?: string;
    liquidityPool?: string;
  } = {};

  // 1. Deploy SAGToken on Creditcoin CC3
  console.log('\n[3/3-A] Deploying SAGToken.sol to Creditcoin 3 Testnet...');
  const sagFactory = new ethers.ContractFactory(compiled.SAGToken.abi, compiled.SAGToken.bytecode, cc3Signer);
  const sagContract = await sagFactory.deploy();
  console.log(`  • Broadcast Tx: ${sagContract.deploymentTransaction()?.hash}`);
  await sagContract.waitForDeployment();
  deploymentResults.sagToken = await sagContract.getAddress();
  console.log(`  ✅ SAGToken Deployed at: ${deploymentResults.sagToken}`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.sagToken}`);

  // 2. Deploy SanadLiquidityPool on Creditcoin CC3
  console.log('\n[3/3-B] Deploying SanadLiquidityPool.sol to Creditcoin 3 Testnet...');
  const poolFactory = new ethers.ContractFactory(
    compiled.SanadLiquidityPool.abi,
    compiled.SanadLiquidityPool.bytecode,
    cc3Signer
  );
  const poolContract = await poolFactory.deploy(deploymentResults.sagToken, ethers.ZeroAddress);
  console.log(`  • Broadcast Tx: ${poolContract.deploymentTransaction()?.hash}`);
  await poolContract.waitForDeployment();
  deploymentResults.liquidityPool = await poolContract.getAddress();
  console.log(`  ✅ SanadLiquidityPool Deployed at: ${deploymentResults.liquidityPool}`);
  console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.liquidityPool}`);

  // 3. Grant SETTLEMENT_ROLE & MINTER_ROLE on SAGToken to SanadLiquidityPool
  console.log('\n[3/3-C] Configuring AccessControl Roles on Creditcoin CC3...');
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  const tx1 = await (sagContract as any).grantRole(SETTLEMENT_ROLE, deploymentResults.liquidityPool);
  await tx1.wait();
  console.log(`  ✅ Granted SETTLEMENT_ROLE to SanadLiquidityPool (Tx: ${tx1.hash})`);

  const tx2 = await (sagContract as any).grantRole(MINTER_ROLE, cc3Signer.address);
  await tx2.wait();
  console.log(`  ✅ Granted MINTER_ROLE to Deployer (Tx: ${tx2.hash})`);

  // Save results to summary
  console.log('\n========================================================================');
  console.log('DEPLOYMENT COMPLETE SUMMARY (CREDITCOIN 3 ONLY)');
  console.log('========================================================================');
  console.log(JSON.stringify(deploymentResults, null, 2));

  return { success: true, deploymentResults };
}

if (process.argv[1]?.endsWith('deploy-testnet.ts') || process.argv[1]?.endsWith('deploy-testnet.js')) {
  deployToTestnet().catch(console.error);
}
