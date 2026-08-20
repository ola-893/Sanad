import fs from 'fs';
import path from 'path';
// @ts-ignore
import solc from 'solc';

function findImports(importPath: string) {
  let fullPath: string;
  if (importPath.startsWith('@openzeppelin/')) {
    fullPath = path.resolve(process.cwd(), 'node_modules', importPath);
  } else {
    fullPath = path.resolve(process.cwd(), 'src', 'contracts', importPath);
  }

  try {
    const contents = fs.readFileSync(fullPath, 'utf8');
    return { contents };
  } catch (e: any) {
    return { error: `File not found: ${fullPath} (${e.message})` };
  }
}

export function compileContracts() {
  const contractsDir = path.resolve(process.cwd(), 'src', 'contracts');
  const sources: Record<string, { content: string }> = {};

  const files = ['SAGToken.sol', 'SanadLiquidityPool.sol', 'SanadCreditOracle.sol'];
  for (const file of files) {
    const filePath = path.join(contractsDir, file);
    if (fs.existsSync(filePath)) {
      sources[file] = { content: fs.readFileSync(filePath, 'utf8') };
    }
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      evmVersion: 'cancun',
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
        },
      },
    },
  };

  console.log('[Compiler] Compiling Solidity smart contracts with solc 0.8.20...');
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === 'error');
    if (fatal.length > 0) {
      console.error('[Compiler] Compilation errors:', fatal);
      throw new Error(`Solidity compilation failed: ${fatal.map((e: any) => e.formattedMessage).join('\n')}`);
    }
  }

  const compiled: Record<string, { abi: any; bytecode: string; deployedBytecode: string }> = {};
  const EIP170_LIMIT = 24576; // 24 KB max runtime bytecode

  console.log('\n--- CONTRACT SIZES & EIP-170 RUNTIME LIMIT (24,576 bytes) ---');
  for (const file of ['SAGToken.sol', 'SanadLiquidityPool.sol', 'SanadCreditOracle.sol']) {
    if (!output.contracts[file]) continue;
    for (const name of Object.keys(output.contracts[file])) {
      const contractData = output.contracts[file][name];
      const initHex = contractData.evm.bytecode.object || '';
      const runtimeHex = contractData.evm.deployedBytecode?.object || '';

      const initBytes = initHex.length / 2;
      const runtimeBytes = runtimeHex.length / 2;
      const pctOfLimit = ((runtimeBytes / EIP170_LIMIT) * 100).toFixed(2);

      compiled[name] = {
        abi: contractData.abi,
        bytecode: initHex,
        deployedBytecode: runtimeHex,
      };

      console.log(`[Compiler] Contract ${name}:`);
      console.log(`  - Creation/Init Bytecode: ${initBytes} bytes (${initHex.length} hex chars)`);
      console.log(`  - Deployed Runtime Bytecode: ${runtimeBytes} bytes (${runtimeHex.length} hex chars) [${pctOfLimit}% of 24KB EIP-170 limit]`);
    }
  }

  return compiled;
}

if (process.argv[1]?.endsWith('compile-contracts.ts') || process.argv[1]?.endsWith('compile-contracts.js')) {
  compileContracts();
}
