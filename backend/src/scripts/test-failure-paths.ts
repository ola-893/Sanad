// Single-chain, Creditcoin only. Do not reintroduce Sepolia, USC, or Attestcoin without explicit sign-off.
import { CREDITCOIN_CONFIG } from '../features/creditcoin/creditcoin.config.js';
import { ethers } from 'ethers';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runFailurePathTests() {
  console.log('================================================================');
  console.log('STRESS-TESTING FAILURE PATHS (CREDITCOIN CC3 SINGLE-CHAIN)');
  console.log('================================================================');

  const creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.rpcUrl, {
    chainId: CREDITCOIN_CONFIG.chainId,
    name: CREDITCOIN_CONFIG.chainName,
  });

  // Test Case 1: Non-existent / unmined Transaction Hash
  console.log('\n[Test 1/3] Verifying RPC rejects non-existent transaction hash...');
  const fakeTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const receipt = await creditcoinProvider.getTransactionReceipt(fakeTxHash);
  const pass1 = receipt === null;
  console.log(`Fake tx receipt: ${receipt}`);
  console.log(`Passed: ${pass1 ? '✅ PASS (null receipt for non-existent tx)' : '❌ FAIL'}`);

  // Test Case 2: Verify RPC connectivity to Creditcoin CC3 Testnet
  console.log('\n[Test 2/3] Verifying live Creditcoin CC3 Testnet connectivity...');
  try {
    const latestBlockNum = await creditcoinProvider.getBlockNumber();
    const block = await creditcoinProvider.getBlock(latestBlockNum);
    const pass2 = latestBlockNum > 0 && block !== null;
    console.log(`Latest block: #${latestBlockNum}`);
    console.log(`Block timestamp: ${block?.timestamp ? new Date(block.timestamp * 1000).toISOString() : 'N/A'}`);
    console.log(`Block txs: ${block?.transactions.length || 0}`);
    console.log(`Passed: ${pass2 ? '✅ PASS (RPC live and returning blocks)' : '❌ FAIL'}`);
  } catch (err: any) {
    console.log(`Passed: ❌ FAIL (RPC error: ${err.message})`);
  }

  // Test Case 3: Verify contract addresses resolve to deployed code
  console.log('\n[Test 3/3] Verifying deployed contract bytecode at configured addresses...');
  const sagCode = await creditcoinProvider.getCode(CREDITCOIN_CONFIG.contracts.sagTokenAddress);
  const poolCode = await creditcoinProvider.getCode(CREDITCOIN_CONFIG.contracts.liquidityPoolAddress);
  const sagHasCode = sagCode !== '0x' && sagCode.length > 2;
  const poolHasCode = poolCode !== '0x' && poolCode.length > 2;
  console.log(`SAGToken (${CREDITCOIN_CONFIG.contracts.sagTokenAddress}): ${sagHasCode ? `✅ ${sagCode.length} bytes deployed` : '❌ No code'}`);
  console.log(`LiquidityPool (${CREDITCOIN_CONFIG.contracts.liquidityPoolAddress}): ${poolHasCode ? `✅ ${poolCode.length} bytes deployed` : '❌ No code'}`);
  console.log(`Passed: ${sagHasCode && poolHasCode ? '✅ PASS (both contracts have on-chain bytecode)' : '❌ FAIL'}`);

  console.log('\n================================================================');
  console.log('ALL FAILURE PATH TESTS COMPLETED');
  console.log('================================================================');
}

if (process.argv[1]?.endsWith('test-failure-paths.ts') || process.argv[1]?.endsWith('test-failure-paths.js')) {
  runFailurePathTests().catch(console.error);
}
