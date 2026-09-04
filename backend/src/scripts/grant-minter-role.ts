/**
 * Usage:
 *   npx tsx src/scripts/grant-minter-role.ts [relayerAddress]
 *
 * Grants MINTER_ROLE on the deployed SAGToken contract to the specified
 * relayer address from the deployer wallet (configured in .env).
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEPLOYED_ADDRESSES } from '../config/deployed-addresses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

const SAG_TOKEN_ABI = [
  'function grantRole(bytes32 role, address account) external',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
];

async function main() {
  const targetAddress = process.argv[2] || '0x506e724d7FDdbF91B6607d5Af0700d385D952f8a';

  if (!ethers.isAddress(targetAddress)) {
    console.error(`❌ Invalid Ethereum address: ${targetAddress}`);
    process.exit(1);
  }

  const privateKey = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Valid funded PRIVATE_KEY not found in backend/.env');
  }

  const cc3Rpc = process.env.CREDITCOIN_RPC_URL || 'https://rpc.cc3-testnet.creditcoin.network';
  const provider = new ethers.JsonRpcProvider(cc3Rpc, 102031, {
    staticNetwork: ethers.Network.from(102031),
  });
  const signer = new ethers.Wallet(privateKey, provider);

  const sagTokenAddress = DEPLOYED_ADDRESSES.cc3.sagToken;
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  console.log('========================================================================');
  console.log('SANAD PROTOCOL — GRANT MINTER_ROLE ON SAGToken (CC3 TESTNET)');
  console.log('========================================================================');
  console.log(`• SAGToken:       ${sagTokenAddress}`);
  console.log(`• Deployer:       ${signer.address}`);
  console.log(`• Target Relayer: ${targetAddress}`);
  console.log(`• MINTER_ROLE:    ${MINTER_ROLE}\n`);

  const sagContract = new ethers.Contract(sagTokenAddress, SAG_TOKEN_ABI, signer);

  const alreadyHasRole = await sagContract.hasRole(MINTER_ROLE, targetAddress);
  if (alreadyHasRole) {
    console.log(`✅ Address ${targetAddress} ALREADY has MINTER_ROLE on SAGToken.`);
    process.exit(0);
  }

  console.log(`Broadcasting grantRole tx from deployer (${signer.address})...`);
  const tx = await sagContract.grantRole(MINTER_ROLE, targetAddress);
  console.log(`• Tx Hash: ${tx.hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
  console.log(`🔗 Explorer: https://creditcoin-testnet.blockscout.com/tx/${tx.hash}`);

  const hasRoleNow = await sagContract.hasRole(MINTER_ROLE, targetAddress);
  console.log(`\nVerification: Target has MINTER_ROLE = ${hasRoleNow}`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
