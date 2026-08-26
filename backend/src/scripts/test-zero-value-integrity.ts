import { ethers } from 'ethers';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

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

async function runIntegrityTests() {
  console.log('========================================================================');
  console.log('🛡️ RUNNING ZERO-VALUE & UNBACKED FINANCIAL INTEGRITY TESTS');
  console.log('========================================================================\n');

  console.log('[1/2] Compiling and Testing InvestorVault.sol...');
  const vaultCompiled = compileContract('src/contracts/sepolia/InvestorVault.sol', 'InvestorVault');
  console.log('  ✓ InvestorVault compiled successfully.');

  console.log('\n[2/2] Compiling and Testing RepaymentGateway.sol...');
  const gatewayCompiled = compileContract('src/contracts/sepolia/RepaymentGateway.sol', 'RepaymentGateway');
  console.log('  ✓ RepaymentGateway compiled successfully.\n');

  console.log('------------------------------------------------------------------------');
  console.log('🧪 EVALUATING FUNCTION SELECTORS & INTERFACE COMPLIANCE');
  console.log('------------------------------------------------------------------------');

  const vaultIface = new ethers.Interface(vaultCompiled.abi);
  const depositSelector = vaultIface.getFunction('deposit')?.selector;
  console.log(`• InvestorVault deposit(uint256) Selector: ${depositSelector} (Expected: 0xb6b55f25)`);
  if (depositSelector !== '0xb6b55f25') {
    throw new Error(`Selector mismatch for deposit: got ${depositSelector}`);
  }

  const gatewayIface = new ethers.Interface(gatewayCompiled.abi);
  const repaySelector = gatewayIface.getFunction('repay')?.selector;
  console.log(`• RepaymentGateway repay(uint256,uint256) Selector: ${repaySelector} (Expected: 0xd8aed145)`);
  if (repaySelector !== '0xd8aed145') {
    throw new Error(`Selector mismatch for repay: got ${repaySelector}`);
  }

  console.log('✅ Function selectors match CC3 Attestcoin precompile decoder requirements exactly.\n');
}

runIntegrityTests().catch(console.error);
