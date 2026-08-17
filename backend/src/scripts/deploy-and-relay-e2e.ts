import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { compileContracts } from './compile-contracts.js';
import { CREDITCOIN_CONFIG } from '../features/creditcoin/creditcoin.config.js';
import { AttestcoinRelayerService } from '../features/creditcoin/attestcoin-relayer.service.js';
import { SagTokenService } from '../features/creditcoin/sag-token.service.js';

dotenv.config();

export async function runEndToEndDeploymentAndRelay() {
  console.log('================================================================');
  console.log('SANAD PROTOCOL - END-TO-END TESTNET DEPLOYMENT & RELAY HARNESS');
  console.log('================================================================');

  const privateKey = process.env.PRIVATE_KEY || process.env.SEPOLIA_PRIVATE_KEY || process.env.CREDITCOIN_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n[ERROR] No PRIVATE_KEY found in environment.');
    console.error('Please configure PRIVATE_KEY in backend/.env with funded Sepolia ETH & tCTC.');
    console.error('- Sepolia Faucet: https://www.alchemy.com/faucets/ethereum-sepolia');
    console.error('- Creditcoin Faucet: https://docs.creditcoin.org/wallets/using-testnet-faucet (Discord #faucet-cc3-testnet)');
    process.exit(1);
  }

  // 1. Providers and Signers
  const sepoliaProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.sourceChain.rpcUrl);
  const creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.rpcUrl, {
    chainId: CREDITCOIN_CONFIG.chainId,
    name: CREDITCOIN_CONFIG.chainName,
  });

  const sepoliaSigner = new ethers.Wallet(privateKey, sepoliaProvider);
  const creditcoinSigner = new ethers.Wallet(privateKey, creditcoinProvider);

  const sepoliaBalance = await sepoliaProvider.getBalance(sepoliaSigner.address);
  const creditcoinBalance = await creditcoinProvider.getBalance(creditcoinSigner.address);

  console.log(`\nDeployer Address: ${sepoliaSigner.address}`);
  console.log(`- Sepolia ETH Balance: ${ethers.formatEther(sepoliaBalance)} ETH`);
  console.log(`- Creditcoin tCTC Balance: ${ethers.formatEther(creditcoinBalance)} tCTC`);

  if (sepoliaBalance === 0n || creditcoinBalance === 0n) {
    console.error('\n[WARNING] Insufficient balance on one of the testnets to broadcast transactions.');
    if (sepoliaBalance === 0n) console.error('-> Fund Sepolia ETH at https://www.alchemy.com/faucets/ethereum-sepolia');
    if (creditcoinBalance === 0n) console.error('-> Fund tCTC via Creditcoin Discord faucet');
    process.exit(1);
  }

  // 2. Compile contracts
  const compiled = compileContracts();

  // 3. Deploy RepaymentGateway on Ethereum Sepolia
  console.log('\n[Step 1/5] Deploying RepaymentGateway.sol to Ethereum Sepolia...');
  const gatewayFactory = new ethers.ContractFactory(
    compiled.RepaymentGateway.abi,
    compiled.RepaymentGateway.bytecode,
    sepoliaSigner
  );

  // Accepted mock token on Sepolia (or deployer address as mock token/treasury)
  const dummyTokenAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
  const gatewayContract = await gatewayFactory.deploy(dummyTokenAddress, sepoliaSigner.address);
  console.log(`Deploy tx broadcast to Sepolia: ${gatewayContract.deploymentTransaction()?.hash}`);
  await gatewayContract.waitForDeployment();
  const gatewayAddress = await gatewayContract.getAddress();
  console.log(`✅ RepaymentGateway deployed on Sepolia at: ${gatewayAddress}`);
  console.log(`   Explorer: https://sepolia.etherscan.io/address/${gatewayAddress}`);

  // 4. Deploy SAGToken on Creditcoin CC3 Testnet
  console.log('\n[Step 2/5] Deploying SAGToken.sol to Creditcoin 3 Testnet...');
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

  // 5. Deploy SanadLiquidityPool on CC3 Testnet
  console.log('\n[Step 3/5] Deploying SanadLiquidityPool.sol to Creditcoin 3 Testnet...');
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

  // Update dynamic contract addresses in environment memory
  CREDITCOIN_CONFIG.contracts.sagTokenAddress = sagAddress;
  CREDITCOIN_CONFIG.contracts.liquidityPoolAddress = poolAddress;
  CREDITCOIN_CONFIG.contracts.sepoliaGatewayAddress = gatewayAddress;

  // 6. Mint Gold Collateral #1 on Creditcoin
  console.log('\n[Step 4/5] Minting SAG Gold Collateral Note #1 on Creditcoin...');
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

  // 7. Execute Source-Chain Repayment on Sepolia
  console.log('\n[Step 5/5] Executing Repayment Transaction on Ethereum Sepolia...');
  // We send an EVM transaction with data payload or standard transfer
  const repayTx = await sepoliaSigner.sendTransaction({
    to: gatewayAddress,
    value: ethers.parseEther('0.0001'), // Small test transfer triggering block inclusion
    data: ethers.hexlify(ethers.toUtf8Bytes(`RepayInvoice:TokenId=${mintResult.tokenId}:Amount=2500`)),
  });

  console.log(`Repayment tx broadcast to Sepolia: ${repayTx.hash}`);
  const repayReceipt = await repayTx.wait();
  console.log(`✅ Repayment confirmed on Sepolia at block #${repayReceipt?.blockNumber}!`);
  console.log(`   Sepolia Etherscan: https://sepolia.etherscan.io/tx/${repayTx.hash}`);

  // 8. Run Attestcoin Relayer Proof Generation & Settlement
  console.log('\n================================================================');
  console.log('RUNNING ATTESTCOIN PROOF RELAYER (WAITING FOR CC3 ATTESTATION)');
  console.log('================================================================');
  console.log(`Targeting Prover: ${CREDITCOIN_CONFIG.proverUrl}`);
  console.log('Attestation wait started. Expected duration: ~15 seconds to 15 minutes.');

  const relayerService = new AttestcoinRelayerService();
  const settlementResult = await relayerService.relayAndSettleRepayment(
    {
      tokenId: mintResult.tokenId || '1',
      sourceTxHash: repayTx.hash,
      repaidAmountUSD: 2500,
      sourceEvmChainId: 11155111,
    },
    (stage, progress, message) => {
      console.log(`[Relayer Progress ${progress}%] [${stage}] ${message}`);
    }
  );

  console.log('\n================================================================');
  console.log('END-TO-END EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Sepolia Repayment Tx Hash: ${repayTx.hash}`);
  console.log(`Sepolia Etherscan URL:     https://sepolia.etherscan.io/tx/${repayTx.hash}`);
  console.log(`Creditcoin Settlement Tx:  ${settlementResult.creditcoinTxHash || 'Pending confirmation'}`);
  console.log(`Creditcoin Explorer URL:   https://creditcoin-testnet.blockscout.com/tx/${settlementResult.creditcoinTxHash}`);
  console.log(`Status:                    ${settlementResult.success ? 'SUCCESS' : 'FAILED: ' + settlementResult.error}`);
}

if (process.argv[1]?.endsWith('deploy-and-relay-e2e.ts') || process.argv[1]?.endsWith('deploy-and-relay-e2e.js')) {
  runEndToEndDeploymentAndRelay().catch(console.error);
}
