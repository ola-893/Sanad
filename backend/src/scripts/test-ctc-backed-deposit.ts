import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const INVESTOR_VAULT_ADDRESS = "0x218565BeC68691178FC61B28FCaEb78592088FDF";
const INVESTOR_VAULT_ABI = [
  "function deposit(uint256 amount) external payable",
  "event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)",
];

const POOL_ADDRESS = "0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70";
const DEMO_ETH_TO_CTC_RATE = 2500n;

async function main() {
  // === STEP 0: Setup ===
  const sepoliaRpc = process.env.ETHEREUM_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);
  const cc3Provider = new ethers.JsonRpcProvider(
    "https://rpc.cc3-testnet.creditcoin.network", 102031,
    { staticNetwork: ethers.Network.from(102031) }
  );

  const pk = process.env.PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY;
  if (!pk) throw new Error("No private key");
  const sepoliaWallet = new ethers.Wallet(pk, sepoliaProvider);
  const cc3Wallet = new ethers.Wallet(pk, cc3Provider);
  console.log("Wallet:", sepoliaWallet.address);

  // === STEP 1: Pre-test balances ===
  const relayerBalBefore = await cc3Provider.getBalance(cc3Wallet.address);
  const poolBalBefore = await cc3Provider.getBalance(POOL_ADDRESS);
  console.log("\n=== PRE-TEST BALANCES ===");
  console.log("Relayer CTC:", ethers.formatEther(relayerBalBefore), "tCTC");
  console.log("Pool CTC:", ethers.formatEther(poolBalBefore), "tCTC");

  // === STEP 2: Deposit on Sepolia (0.001 ETH with explicit gas) ===
  const depositAmountWei = ethers.parseEther("0.001"); // 0.001 ETH
  const vault = new ethers.Contract(INVESTOR_VAULT_ADDRESS, INVESTOR_VAULT_ABI, sepoliaWallet);

  console.log(`\n=== STEP 1: Depositing 0.001 ETH into InvestorVault on Sepolia ===`);
  const feeData = await sepoliaProvider.getFeeData();
  const sepoliaTx = await vault.deposit(depositAmountWei, {
    value: depositAmountWei,
    gasLimit: 100000n,
    maxFeePerGas: feeData.maxFeePerGas! * 2n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas! * 2n,
  });
  console.log("Sepolia Tx Hash:", sepoliaTx.hash);
  console.log("Waiting for confirmation...");
  const sepoliaReceipt = await sepoliaTx.wait();
  console.log("✅ Confirmed in block:", sepoliaReceipt!.blockNumber);
  console.log("Sepolia Explorer:", `https://sepolia.etherscan.io/tx/${sepoliaTx.hash}`);

  const expectedCtcWei = depositAmountWei * DEMO_ETH_TO_CTC_RATE;
  console.log(`\nExpected CTC backing: 0.001 ETH × ${DEMO_ETH_TO_CTC_RATE} = ${ethers.formatEther(expectedCtcWei)} tCTC`);

  // === STEP 3: Prove via backend API ===
  console.log(`\n=== STEP 2: Calling POST /api/v1/investor/deposit/prove ===`);
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const resp = await fetch(`${backendUrl}/api/v1/investor/deposit/prove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceTxHash: sepoliaTx.hash, chainKey: 1 }),
  });

  const result = await resp.json();
  console.log("Backend response:", JSON.stringify(result, null, 2));

  // === STEP 4: Post-test balances ===
  console.log("\nWaiting 5s for CC3 finality...");
  await new Promise((r) => setTimeout(r, 5000));

  const relayerBalAfter = await cc3Provider.getBalance(cc3Wallet.address);
  const poolBalAfter = await cc3Provider.getBalance(POOL_ADDRESS);

  console.log("\n=== POST-TEST BALANCES ===");
  console.log("Relayer CTC:", ethers.formatEther(relayerBalAfter), "tCTC");
  console.log("Pool CTC:", ethers.formatEther(poolBalAfter), "tCTC");

  console.log("\n=== BALANCE DELTAS ===");
  const relayerDelta = relayerBalAfter - relayerBalBefore;
  const poolDelta = poolBalAfter - poolBalBefore;
  console.log("Relayer CTC delta:", ethers.formatEther(relayerDelta), "tCTC (should be negative)");
  console.log("Pool CTC delta:", ethers.formatEther(poolDelta), "tCTC (should be +2.5 tCTC)");

  if (poolDelta > 0n) {
    console.log("\n✅ SUCCESS: Pool received real CTC backing from the relayer wallet.");
    console.log("Pool balance change proves CTC actually left the relayer and landed in the pool.");
  } else {
    console.log("\n⚠️ Pool balance did not increase — check backend logs.");
  }
}

main().catch(console.error);
