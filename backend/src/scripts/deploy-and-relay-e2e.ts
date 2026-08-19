// Single-chain, Creditcoin only. Do not reintroduce Sepolia, USC, or Attestcoin without explicit sign-off.
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { compileContracts } from './compile-contracts.js';
import { CREDITCOIN_CONFIG } from '../features/creditcoin/creditcoin.config.js';
import { SagTokenService } from '../features/creditcoin/sag-token.service.js';

dotenv.config();

export async function runEndToEndDeployment() {
  console.log('================================================================');
  console.log('SANAD PROTOCOL - END-TO-END CC3 TESTNET DEPLOYMENT');
  console.log('================================================================');

  const privateKey = process.env.PRIVATE_KEY || process.env.CREDITCOIN_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n[ERROR] No PRIVATE_KEY found in environment.');
    console.error('Please configure PRIVATE_KEY in backend/.env with a funded Creditcoin CC3 Testnet wallet.');
    console.error('- Creditcoin Faucet: https://docs.creditcoin.org/wallets/using-testnet-faucet (Discord #faucet-cc3-testnet)');
    process.exit(1);
  }

  // 1. Provider and Signer (single-chain: Creditcoin CC3 Testnet)
  const creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.rpcUrl, {
    chainId: CREDITCOIN_CONFIG.chainId,
    name: CREDITCOIN_CONFIG.chainName,
  });

  const creditcoinSigner = new ethers.Wallet(privateKey, creditcoinProvider);
  const creditcoinBalance = await creditcoinProvider.getBalance(creditcoinSigner.address);

  console.log(`\nDeployer Address: ${creditcoinSigner.address}`);
  console.log(`- Creditcoin tCTC Balance: ${ethers.formatEther(creditcoinBalance)} tCTC`);

  if (creditcoinBalance === 0n) {
    console.error('\n[ERROR] No tCTC balance. Fund your wallet via Creditcoin Discord faucet.');
    process.exit(1);
  }

  // 2. Compile contracts
  const compiled = compileContracts();

  // 3. Deploy SAGToken on Creditcoin CC3 Testnet
  console.log('\n[Step 1/3] Deploying SAGToken.sol to Creditcoin 3 Testnet...');
  const sagFactory = new ethers.ContractFactory(
    compiled.SAGToken.abi,
    compiled.SAGToken.bytecode,
    creditcoinSigner
  );
  const sagContract = await sagFactory.deploy();
  console.log(`Deploy tx broadcast to CC3: ${sagContract.deploymentTransaction()?.hash}`);
  await sagContract.waitForDeployment();
  const sagAddress = await sagContract.getAddress();
  console.log(`✅ SAGToken deployed on CC3 at: ${sagAddress}`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/address/${sagAddress}`);

  // 4. Deploy SanadLiquidityPool on CC3 Testnet
  console.log('\n[Step 2/3] Deploying SanadLiquidityPool.sol to Creditcoin 3 Testnet...');
  const poolFactory = new ethers.ContractFactory(
    compiled.SanadLiquidityPool.abi,
    compiled.SanadLiquidityPool.bytecode,
    creditcoinSigner
  );
  const poolContract = await poolFactory.deploy(sagAddress, ethers.ZeroAddress);
  console.log(`Deploy tx broadcast to CC3: ${poolContract.deploymentTransaction()?.hash}`);
  await poolContract.waitForDeployment();
  const poolAddress = await poolContract.getAddress();
  console.log(`✅ SanadLiquidityPool deployed on CC3 at: ${poolAddress}`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/address/${poolAddress}`);

  // Configure AccessControl roles
  console.log('\n[Role Setup] Configuring AccessControl Roles on Creditcoin CC3...');
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SETTLEMENT_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
  const tx1 = await (sagContract as any).grantRole(SETTLEMENT_ROLE, poolAddress);
  await tx1.wait();
  console.log(`✅ Granted SETTLEMENT_ROLE to SanadLiquidityPool (Tx: ${tx1.hash})`);
  const tx2 = await (sagContract as any).grantRole(MINTER_ROLE, creditcoinSigner.address);
  await tx2.wait();
  console.log(`✅ Granted MINTER_ROLE to Deployer (Tx: ${tx2.hash})`);

  // Update dynamic contract addresses in environment memory
  CREDITCOIN_CONFIG.contracts.sagTokenAddress = sagAddress;
  CREDITCOIN_CONFIG.contracts.liquidityPoolAddress = poolAddress;

  // 5. Mint Gold Collateral #1 on Creditcoin
  console.log('\n[Step 3/3] Minting SAG Gold Collateral Note #1 on Creditcoin...');
  const sagService = new SagTokenService();
  const mintResult = await sagService.mintCollateral({
    pawnshopAddress: creditcoinSigner.address,
    borrowerAddress: creditcoinSigner.address,
    weightGrams: 50.5,
    karat: 22,
    appraisedValueUSD: 3850,
    loanAmount: 2500,
    ipfsMetadataUri: 'ipfs://QmSanadGoldVaultProofExample123',
  });

  console.log(`✅ Collateral Minted! Token ID: ${mintResult.tokenId}`);
  console.log(`   CC3 Mint Tx: ${mintResult.transactionHash}`);
  console.log(`   Explorer: https://creditcoin-testnet.blockscout.com/tx/${mintResult.transactionHash}`);

  console.log('\n================================================================');
  console.log('END-TO-END EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`SAGToken Address:          ${sagAddress}`);
  console.log(`SanadLiquidityPool Addr:   ${poolAddress}`);
  console.log(`Minted Token ID:           ${mintResult.tokenId}`);
  console.log(`Creditcoin Explorer:       https://creditcoin-testnet.blockscout.com/address/${sagAddress}`);
}

if (process.argv[1]?.endsWith('deploy-and-relay-e2e.ts') || process.argv[1]?.endsWith('deploy-and-relay-e2e.js')) {
  runEndToEndDeployment().catch(console.error);
}
