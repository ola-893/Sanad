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
if (!PRIVATE_KEY) {
  throw new Error('Missing PRIVATE_KEY in environment');
}

const SEPOLIA_RPC_URL = process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const CC3_RPC_URL = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';

function compileSepoliaGateway() {
  console.log('Compiling RepaymentGateway.sol...');
  const contractPath = path.join(rootDir, 'src/contracts/sepolia/RepaymentGateway.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'RepaymentGateway.sol': { content: source },
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

  const contract = output.contracts['RepaymentGateway.sol']['RepaymentGateway'];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

export async function deploySepoliaGateway() {
  console.log('================================================================');
  console.log('🚀 DEPLOYING REPAYMENT GATEWAY TO ETHEREUM SEPOLIA');
  console.log('================================================================');

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);

  console.log(`Deployer Wallet: ${sepoliaWallet.address}`);
  const sepoliaBal = await sepoliaProvider.getBalance(sepoliaWallet.address);
  console.log(`Sepolia Balance: ${ethers.formatEther(sepoliaBal)} SepoliaETH`);

  if (sepoliaBal === 0n) {
    throw new Error('Insufficient SepoliaETH for deployment');
  }

  const { abi, bytecode } = compileSepoliaGateway();
  const factory = new ethers.ContractFactory(abi, bytecode, sepoliaWallet);

  console.log('Broadcasting deployment to Sepolia...');
  const gateway = await factory.deploy(sepoliaWallet.address);
  await gateway.waitForDeployment();
  const gatewayAddress = await gateway.getAddress();

  console.log(`\n🎉 RepaymentGateway deployed on Sepolia at: ${gatewayAddress}`);
  console.log(`Sepolia Explorer: https://sepolia.etherscan.io/address/${gatewayAddress}`);

  // Update .env
  const envPath = path.join(rootDir, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('SEPOLIA_REPAYMENT_GATEWAY_ADDRESS=')) {
    envContent = envContent.replace(
      /SEPOLIA_REPAYMENT_GATEWAY_ADDRESS=.*(\r?\n|$)/,
      `SEPOLIA_REPAYMENT_GATEWAY_ADDRESS="${gatewayAddress}"\n`
    );
  } else {
    envContent += `\nSEPOLIA_REPAYMENT_GATEWAY_ADDRESS="${gatewayAddress}"\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log('✓ Updated SEPOLIA_REPAYMENT_GATEWAY_ADDRESS in .env');

  return { gatewayAddress, abi };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  deploySepoliaGateway().catch(console.error);
}
