import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });

async function rotateKey() {
  console.log('========================================================================');
  console.log('🔑 ROTATING EXPOSED PRIVATE KEY & FUNDING FRESH RELAYER WALLET');
  console.log('========================================================================\n');

  const cc3Provider = new ethers.JsonRpcProvider('https://rpc.cc3-testnet.creditcoin.network');
  const sepoliaProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

  const oldPrivateKey = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!oldPrivateKey) throw new Error('No old private key found');

  const oldWalletCC3 = new ethers.Wallet(oldPrivateKey, cc3Provider);
  const oldWalletSepolia = new ethers.Wallet(oldPrivateKey, sepoliaProvider);

  const cc3Bal = await cc3Provider.getBalance(oldWalletCC3.address);
  const sepBal = await sepoliaProvider.getBalance(oldWalletSepolia.address);

  console.log(`• Old Exposed Address: ${oldWalletCC3.address}`);
  console.log(`  - CC3 Balance:     ${ethers.formatEther(cc3Bal)} tCTC`);
  console.log(`  - Sepolia Balance: ${ethers.formatEther(sepBal)} SepoliaETH\n`);

  // Generate completely new random wallet
  const newWallet = ethers.Wallet.createRandom();
  console.log(`• New Rotated Address: ${newWallet.address}`);
  console.log(`  (Private key generated securely in memory)\n`);

  // 1. Transfer funds on CC3
  const ctcToSend = (cc3Bal * 90n) / 100n;
  if (ctcToSend > 0n) {
    console.log(`[1/4] Transferring ${ethers.formatEther(ctcToSend)} tCTC to new wallet on CC3...`);
    const tx1 = await oldWalletCC3.sendTransaction({
      to: newWallet.address,
      value: ctcToSend,
    });
    await tx1.wait();
    console.log(`  ✅ CC3 Transfer Confirmed: ${tx1.hash}`);
  }

  // 2. Transfer funds on Sepolia
  const feeData = await sepoliaProvider.getFeeData();
  const gasLimit = 21000n;
  const gasCost = gasLimit * (feeData.gasPrice || 1000000000n) * 2n;
  if (sepBal > gasCost) {
    const sepToSend = sepBal - gasCost;
    console.log(`[2/4] Transferring ${ethers.formatEther(sepToSend)} SepoliaETH to new wallet on Sepolia...`);
    const tx2 = await oldWalletSepolia.sendTransaction({
      to: newWallet.address,
      value: sepToSend,
    });
    await tx2.wait();
    console.log(`  ✅ Sepolia Transfer Confirmed: ${tx2.hash}`);
  }

  // 3. Transfer Contract Ownership on CC3
  const poolAddress = '0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70';
  const oracleAddress = '0x74357E5FED91D6dDdd39847304b8651634693A00';

  console.log('\n[3/4] Updating Smart Contract Ownership to New Wallet on CC3...');
  const pool = new ethers.Contract(poolAddress, ['function transferOwnership(address) external', 'function owner() view returns (address)'], oldWalletCC3);
  const oracle = new ethers.Contract(oracleAddress, ['function transferOwnership(address) external', 'function owner() view returns (address)'], oldWalletCC3);

  try {
    const pOwner = await pool.owner();
    if (pOwner.toLowerCase() === oldWalletCC3.address.toLowerCase()) {
      const pTx = await pool.transferOwnership(newWallet.address);
      await pTx.wait();
      console.log(`  ✅ Transferred CC3 LiquidityPool ownership to: ${newWallet.address}`);
    } else {
      console.log(`  ℹ️ Pool owner is already: ${pOwner}`);
    }
  } catch (e: any) {
    console.log(`  ℹ️ Pool ownership check: ${e.message}`);
  }

  try {
    const oOwner = await oracle.owner();
    if (oOwner.toLowerCase() === oldWalletCC3.address.toLowerCase()) {
      const oTx = await oracle.transferOwnership(newWallet.address);
      await oTx.wait();
      console.log(`  ✅ Transferred CC3 Oracle ownership to: ${newWallet.address}`);
    } else {
      console.log(`  ℹ️ Oracle owner is already: ${oOwner}`);
    }
  } catch (e: any) {
    console.log(`  ℹ️ Oracle ownership check: ${e.message}`);
  }

  // 4. Update .env
  console.log('\n[4/4] Updating local .env with new private key...');
  const envPath = path.join(rootDir, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/CREDITCOIN_PRIVATE_KEY=["']?[^"\x27\r\n]+["']?/, `CREDITCOIN_PRIVATE_KEY="${newWallet.privateKey}"`);
  envContent = envContent.replace(/PRIVATE_KEY=["']?[^"\x27\r\n]+["']?/, `PRIVATE_KEY="${newWallet.privateKey}"`);
  fs.writeFileSync(envPath, envContent);
  console.log('  ✅ Saved new private key into backend/.env (not tracked in git)');

  // 5. Verification
  const finalCc3Bal = await cc3Provider.getBalance(newWallet.address);
  const finalSepBal = await sepoliaProvider.getBalance(newWallet.address);
  console.log('\n========================================================================');
  console.log('🎉 ROTATION COMPLETE: VERIFIED NEW RELAYER WALLET');
  console.log('========================================================================');
  console.log(`• New Relayer Address: ${newWallet.address}`);
  console.log(`• New CC3 Balance:     ${ethers.formatEther(finalCc3Bal)} tCTC`);
  console.log(`• New Sepolia Balance: ${ethers.formatEther(finalSepBal)} SepoliaETH`);
  console.log(`• Is Different from Exposed Key: ${newWallet.address.toLowerCase() !== oldWalletCC3.address.toLowerCase()}`);
}

rotateKey().catch(console.error);
