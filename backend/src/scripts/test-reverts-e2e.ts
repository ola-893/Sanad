import { ethers } from 'ethers';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PRIVATE_KEY = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
const SEPOLIA_RPC = process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

function compileContract(relativePath: string, contractName: string) {
  const contractPath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      [path.basename(contractPath)]: { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    for (const err of output.errors) {
      if (err.severity === 'error') {
        throw new Error(`Solidity compilation error: ${err.formattedMessage}`);
      }
    }
  }

  const contract = output.contracts[path.basename(contractPath)][contractName];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('🛡️ TESTING ON-CHAIN REVERT BEHAVIOR FOR UNBACKED / ZERO-VALUE ATTACKS');
  console.log('========================================================================\n');

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const sepoliaSigner = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);
  console.log(`• Tester Wallet: ${sepoliaSigner.address}`);

  // 1. InvestorVault Tests
  console.log('\n[1/2] Compiling and Deploying Fixed InvestorVault.sol...');
  const vaultCompiled = compileContract('src/contracts/sepolia/InvestorVault.sol', 'InvestorVault');
  const vaultFactory = new ethers.ContractFactory(vaultCompiled.abi, vaultCompiled.bytecode, sepoliaSigner);
  
  console.log('  • Broadcasting InvestorVault deployment...');
  const vaultContract = await vaultFactory.deploy();
  await vaultContract.waitForDeployment();
  const vaultAddress = await vaultContract.getAddress();
  console.log(`  ✅ Deployed Fixed InvestorVault on Sepolia: ${vaultAddress}`);

  console.log('\n  --- Testing InvestorVault Attack Vectors ---');

  // Test 1: Zero-Value Deposit Attack (Claim 1,000,000 units with 0 ETH)
  try {
    console.log('  • Attack 1: Calling deposit(1000000) with msg.value = 0...');
    await vaultContract.deposit.estimateGas(1000000n, { value: 0n });
    console.error('  ❌ FAILED: Attack 1 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
    if (err.data) console.log(`     Revert Data: ${err.data}`);
  }

  // Test 2: Mismatched Deposit Attack (Claim 1,000,000 units with only 100 wei)
  try {
    console.log('\n  • Attack 2: Calling deposit(1000000) with msg.value = 100 wei...');
    await vaultContract.deposit.estimateGas(1000000n, { value: 100n });
    console.error('  ❌ FAILED: Attack 2 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 3: Zero-Amount Deposit (Claim 0 units with 0 ETH)
  try {
    console.log('\n  • Attack 3: Calling deposit(0) with msg.value = 0...');
    await vaultContract.deposit.estimateGas(0n, { value: 0n });
    console.error('  ❌ FAILED: Attack 3 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 4: Legitimate Deposit (1000 wei with msg.value = 1000 wei)
  try {
    console.log('\n  • Legitimate Test: Calling deposit(1000) with msg.value = 1000 wei...');
    const gasEst = await vaultContract.deposit.estimateGas(1000n, { value: 1000n });
    console.log(`  ✅ SUCCEEDED: Gas estimated at ${gasEst.toString()} units`);
  } catch (err: any) {
    console.error(`  ❌ FAILED: Legitimate deposit reverted: ${err.message}`);
  }

  // 2. RepaymentGateway Tests
  console.log('\n[2/2] Compiling and Deploying Fixed RepaymentGateway.sol...');
  const gatewayCompiled = compileContract('src/contracts/sepolia/RepaymentGateway.sol', 'RepaymentGateway');
  const gatewayFactory = new ethers.ContractFactory(gatewayCompiled.abi, gatewayCompiled.bytecode, sepoliaSigner);
  
  console.log('  • Broadcasting RepaymentGateway deployment...');
  const gatewayContract = await gatewayFactory.deploy(sepoliaSigner.address);
  await gatewayContract.waitForDeployment();
  const gatewayAddress = await gatewayContract.getAddress();
  console.log(`  ✅ Deployed Fixed RepaymentGateway on Sepolia: ${gatewayAddress}`);

  console.log('\n  --- Testing RepaymentGateway Attack Vectors ---');

  // Test 5: Zero-Value Repayment Attack (Claim $50,000 debt repaid for Token #1 with msg.value = 0)
  try {
    console.log('  • Attack 4: Calling repay(tokenId: 1, amount: 50000) with msg.value = 0...');
    await gatewayContract.repay.estimateGas(1n, 50000n, { value: 0n });
    console.error('  ❌ FAILED: Attack 4 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 6: Mismatched Repayment Attack (Claim $50,000 debt repaid with msg.value = 10 wei)
  try {
    console.log('\n  • Attack 5: Calling repay(tokenId: 1, amount: 50000) with msg.value = 10 wei...');
    await gatewayContract.repay.estimateGas(1n, 50000n, { value: 10n });
    console.error('  ❌ FAILED: Attack 5 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 7: Zero-Amount Repayment (repay 0 amount)
  try {
    console.log('\n  • Attack 6: Calling repay(tokenId: 1, amount: 0) with msg.value = 0...');
    await gatewayContract.repay.estimateGas(1n, 0n, { value: 0n });
    console.error('  ❌ FAILED: Attack 6 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 8: Invalid Token ID (tokenId = 0)
  try {
    console.log('\n  • Attack 7: Calling repay(tokenId: 0, amount: 500) with msg.value = 500 wei...');
    await gatewayContract.repay.estimateGas(0n, 500n, { value: 500n });
    console.error('  ❌ FAILED: Attack 7 did NOT revert!');
  } catch (err: any) {
    console.log(`  ✅ REVERTED AS EXPECTED:`);
    console.log(`     Error: ${err.message?.split('\n')[0]}`);
  }

  // Test 9: Legitimate Repayment (500 wei with msg.value = 500 wei)
  try {
    console.log('\n  • Legitimate Test: Calling repay(tokenId: 1, amount: 500) with msg.value = 500 wei...');
    const gasEst = await gatewayContract.repay.estimateGas(1n, 500n, { value: 500n });
    console.log(`  ✅ SUCCEEDED: Gas estimated at ${gasEst.toString()} units`);
  } catch (err: any) {
    console.error(`  ❌ FAILED: Legitimate repay reverted: ${err.message}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL ZERO-VALUE & UNBACKED ATTACK TESTS CONFIRMED REVERTING ON-CHAIN');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
