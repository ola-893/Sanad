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

  const files = ['SAGToken.sol', 'SanadLiquidityPool.sol', 'RepaymentGateway.sol'];
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
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
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

  const compiled: Record<string, { abi: any; bytecode: string }> = {};

  for (const file of Object.keys(output.contracts || {})) {
    for (const name of Object.keys(output.contracts[file])) {
      compiled[name] = {
        abi: output.contracts[file][name].abi,
        bytecode: output.contracts[file][name].evm.bytecode.object,
      };
      console.log(`[Compiler] Contract ${name} compiled successfully (bytecode length: ${compiled[name].bytecode.length})`);
    }
  }

  return compiled;
}

if (process.argv[1]?.endsWith('compile-contracts.ts') || process.argv[1]?.endsWith('compile-contracts.js')) {
  compileContracts();
}
