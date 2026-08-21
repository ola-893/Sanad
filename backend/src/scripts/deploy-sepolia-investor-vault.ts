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
const CC3_POOL_ADDRESS = process.env.SANAD_LIQUIDITY_POOL_ADDRESS;

function compileInvestorVault() {
  console.log('Compiling InvestorVault.sol...');
  const contractPath = path.join(rootDir, 'src/contracts/sepolia/InvestorVault.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'InvestorVault.sol': { content: source },
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

  const contract = output.contracts['InvestorVault.sol']['InvestorVault'];
  return {
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object,
  };
}

export async function deploySepoliaInvestorVault() {
  console.log('================================================================');
  console.log('🚀 DEPLOYING INVESTOR VAULT TO ETHEREUM SEPOLIA');
  console.log('================================================================');

  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const sepoliaWallet = new ethers.Wallet(PRIVATE_KEY!, sepoliaProvider);

  console.log(`Deployer Wallet: ${sepoliaWallet.address}`);
  const sepoliaBal = await sepoliaProvider.getBalance(sepoliaWallet.address);
  console.log(`Sepolia Balance: ${ethers.formatEther(sepoliaBal)} SepoliaETH`);

  if (sepoliaBal === 0n) {
    throw new Error('Insufficient SepoliaETH for deployment');
  }

  const { abi, bytecode } = compileInvestorVault();
  const factory = new ethers.ContractFactory(abi, bytecode, sepoliaWallet);

  console.log('Broadcasting deployment to Sepolia...');
  const vault = await factory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log(`\n🎉 InvestorVault deployed on Sepolia at: ${vaultAddress}`);
  console.log(`Sepolia Explorer: https://sepolia.etherscan.io/address/${vaultAddress}`);

  // Update .env
  const envPath = path.join(rootDir, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('SEPOLIA_INVESTOR_VAULT_ADDRESS=')) {
    envContent = envContent.replace(
      /SEPOLIA_INVESTOR_VAULT_ADDRESS=.*(\r?\n|$)/,
      `SEPOLIA_INVESTOR_VAULT_ADDRESS="${vaultAddress}"\n`
    );
  } else {
    envContent += `\nSEPOLIA_INVESTOR_VAULT_ADDRESS="${vaultAddress}"\n`;
  }
  fs.writeFileSync(envPath, envContent);
  console.log('✓ Updated SEPOLIA_INVESTOR_VAULT_ADDRESS in .env');

  // Configure on CC3 Pool if available
  if (CC3_POOL_ADDRESS) {
    console.log('\nConfiguring setInvestorVaultAddress on Creditcoin CC3 Pool...');
    const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC_URL);
    const cc3Wallet = new ethers.Wallet(PRIVATE_KEY!, cc3Provider);

    const poolAbi = [
      'function setInvestorVaultAddress(address _investorVault) external',
      'function investorVaultAddress() external view returns (address)',
    ];
    const pool = new ethers.Contract(CC3_POOL_ADDRESS, poolAbi, cc3Wallet);

    try {
      const currentVault = await pool.investorVaultAddress();
      console.log(`Current Vault on CC3 Pool: ${currentVault}`);
      if (currentVault.toLowerCase() !== vaultAddress.toLowerCase()) {
        const tx = await pool.setInvestorVaultAddress(vaultAddress);
        console.log(`Submitted setInvestorVaultAddress tx: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Set InvestorVault to ${vaultAddress} on CC3 Pool!`);
      } else {
        console.log(`✓ Vault already correctly configured on CC3 Pool.`);
      }
    } catch (e: any) {
      console.log(`ℹ️ Notice during CC3 config: ${e.message}`);
    }
  }

  return { vaultAddress, abi };
}

if (process.argv[1] && process.argv[1].endsWith('deploy-sepolia-investor-vault.ts')) {
  deploySepoliaInvestorVault().catch(console.error);
}
