import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { compileContracts } from './compile-contracts.js';

dotenv.config();

export async function deployToTestnet() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL - DUAL-CHAIN TESTNET DEPLOYMENT (CC3 + SEPOLIA)');
  console.log('========================================================================\n');

  const privateKey = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY;
  if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
    console.error('❌ [DEPLOYMENT HALTED] Valid funded PRIVATE_KEY not found in backend/.env.');
    console.log('\nTo deploy live smart contracts to Creditcoin 3 & Ethereum Sepolia:');
    console.log('1. Set CREDITCOIN_PRIVATE_KEY in backend/.env');
    console.log('2. Ensure account has:');
    console.log('   • tCTC on Creditcoin 3 Testnet (Chain ID 102031)');
    console.log('     Faucet: https://docs.creditcoin.org/wallets/using-testnet-faucet');
    console.log('   • Sepolia ETH on Ethereum Sepolia (Chain ID 11155111)');
    console.log('     Faucet: https://www.alchemy.com/faucets/ethereum-sepolia');
    return { success: false, reason: 'MISSING_KEY' };
  }

  const cc3Rpc = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
  const sepoliaRpc = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

  console.log('[1/4] Connecting to Network RPCs...');
  console.log(`• Creditcoin 3 Testnet RPC: ${cc3Rpc}`);
  console.log(`• Ethereum Sepolia RPC:     ${sepoliaRpc}`);

  const cc3Provider = new ethers.JsonRpcProvider(cc3Rpc, {
    chainId: 102031,
    name: 'Creditcoin3Testnet',
  });
  const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);

  const cc3Signer = new ethers.Wallet(privateKey, cc3Provider);
  const sepoliaSigner = new ethers.Wallet(privateKey, sepoliaProvider);

  console.log(`\nDeployer Address: ${cc3Signer.address}`);

  const [cc3Bal, sepoliaBal] = await Promise.all([
    cc3Provider.getBalance(cc3Signer.address).catch(() => 0n),
    sepoliaProvider.getBalance(sepoliaSigner.address).catch(() => 0n),
  ]);

  console.log(`• tCTC Balance (Creditcoin CC3): ${ethers.formatEther(cc3Bal)} tCTC`);
  console.log(`• Sepolia ETH Balance:           ${ethers.formatEther(sepoliaBal)} ETH`);

  if (cc3Bal === 0n && sepoliaBal === 0n) {
    console.error('\n❌ Account has 0 balance on both testnets. Cannot broadcast transactions.');
    return { success: false, reason: 'ZERO_BALANCE', address: cc3Signer.address };
  }

  console.log('\n[2/4] Compiling Smart Contracts (solc 0.8.20 / Cancun / viaIR)...');
  const compiled = compileContracts();

  const deploymentResults: {
    sagToken?: string;
    liquidityPool?: string;
    repaymentGateway?: string;
  } = {};

  // 1. Deploy SAGToken on Creditcoin CC3
  if (cc3Bal > 0n) {
    console.log('\n[3/4-A] Deploying SAGToken.sol to Creditcoin 3 Testnet...');
    const sagFactory = new ethers.ContractFactory(compiled.SAGToken.abi, compiled.SAGToken.bytecode, cc3Signer);
    const sagContract = await sagFactory.deploy();
    console.log(`  • Broadcast Tx: ${sagContract.deploymentTransaction()?.hash}`);
    await sagContract.waitForDeployment();
    deploymentResults.sagToken = await sagContract.getAddress();
    console.log(`  ✅ SAGToken Deployed at: ${deploymentResults.sagToken}`);
    console.log(`     Explorer: https://creditcoin-testnet.blockscout.com/address/${deploymentResults.sagToken}`);

    // 2. Deploy SanadLiquidityPool on Creditcoin CC3
    console.log('\n[3/4-B] Deploying SanadLiquidityPool.sol to Creditcoin 3 Testnet...');
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
    console.log('\n[3/4-C] Configuring AccessControl Roles on Creditcoin CC3...');
    const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

    const tx1 = await (sagContract as any).grantRole(SETTLEMENT_ROLE, deploymentResults.liquidityPool);
    await tx1.wait();
    console.log(`  ✅ Granted SETTLEMENT_ROLE to SanadLiquidityPool (Tx: ${tx1.hash})`);

    const tx2 = await (sagContract as any).grantRole(MINTER_ROLE, cc3Signer.address);
    await tx2.wait();
    console.log(`  ✅ Granted MINTER_ROLE to Deployer (Tx: ${tx2.hash})`);
  } else {
    console.log('\n⚠️ Skipping CC3 deployment due to 0 tCTC balance.');
  }

  // 4. Deploy RepaymentGateway on Ethereum Sepolia
  if (sepoliaBal > 0n) {
    console.log('\n[4/4] Deploying RepaymentGateway.sol to Ethereum Sepolia...');
    const gatewayFactory = new ethers.ContractFactory(
      compiled.RepaymentGateway.abi,
      compiled.RepaymentGateway.bytecode,
      sepoliaSigner
    );
    const dummyToken = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    const gatewayContract = await gatewayFactory.deploy(dummyToken, sepoliaSigner.address);
    console.log(`  • Broadcast Tx: ${gatewayContract.deploymentTransaction()?.hash}`);
    await gatewayContract.waitForDeployment();
    deploymentResults.repaymentGateway = await gatewayContract.getAddress();
    console.log(`  ✅ RepaymentGateway Deployed on Sepolia at: ${deploymentResults.repaymentGateway}`);
    console.log(`     Explorer: https://sepolia.etherscan.io/address/${deploymentResults.repaymentGateway}`);
  } else {
    console.log('\n⚠️ Skipping Sepolia deployment due to 0 Sepolia ETH balance.');
  }

  // Save results to .env and config if deployed
  console.log('\n========================================================================');
  console.log('DEPLOYMENT COMPLETE SUMMARY');
  console.log('========================================================================');
  console.log(JSON.stringify(deploymentResults, null, 2));

  return { success: true, deploymentResults };
}

if (process.argv[1]?.endsWith('deploy-testnet.ts') || process.argv[1]?.endsWith('deploy-testnet.js')) {
  deployToTestnet().catch(console.error);
}
