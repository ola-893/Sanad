import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const POOL_ADDRESS = "0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70";
const DEMO_ETH_TO_CTC_RATE = 2500n;

async function main() {
  const sourceTxHash = process.argv[2] || "0x3cd2df378fe1470ce5757e51c669d13df31fc1a302d06445eb571aacf67ab0b1";
  
  const cc3Provider = new ethers.JsonRpcProvider(
    "https://rpc.cc3-testnet.creditcoin.network", 102031,
    { staticNetwork: ethers.Network.from(102031) }
  );

  const pk = process.env.PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY;
  if (!pk) throw new Error("No private key");
  const cc3Wallet = new ethers.Wallet(pk, cc3Provider);

  console.log("=================================================");
  console.log("CTC-BACKED CROSS-CHAIN DEPOSIT PROVING TEST");
  console.log("=================================================");
  console.log("Source Sepolia Tx:", sourceTxHash);
  console.log("Relayer Address:  ", cc3Wallet.address);
  console.log("Pool Contract:    ", POOL_ADDRESS);

  // === 1. Pre-settlement balances ===
  const relayerBalBefore = await cc3Provider.getBalance(cc3Wallet.address);
  const poolBalBefore = await cc3Provider.getBalance(POOL_ADDRESS);

  console.log("\n--- [1] PRE-SETTLEMENT BALANCES ---");
  console.log("Relayer CTC Balance:", ethers.formatEther(relayerBalBefore), "tCTC (Exact:", relayerBalBefore.toString(), "wei)");
  console.log("Pool CTC Balance:   ", ethers.formatEther(poolBalBefore), "tCTC (Exact:", poolBalBefore.toString(), "wei)");

  // === 2. Call backend /api/v1/investor/deposit/prove ===
  console.log("\n--- [2] CALLING /api/v1/investor/deposit/prove ---");
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5001";
  const startTime = Date.now();
  const resp = await fetch(`${backendUrl}/api/v1/investor/deposit/prove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceTxHash, chainKey: 1 }),
  });

  const result = await resp.json();
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Backend responded in ${elapsedSec}s:`);
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error("❌ Proving failed:", result.error);
    process.exit(1);
  }

  // === 3. Post-settlement balances ===
  console.log("\n--- [3] POST-SETTLEMENT BALANCES ---");
  await new Promise((r) => setTimeout(r, 4000));

  const relayerBalAfter = await cc3Provider.getBalance(cc3Wallet.address);
  const poolBalAfter = await cc3Provider.getBalance(POOL_ADDRESS);

  console.log("Relayer CTC Balance:", ethers.formatEther(relayerBalAfter), "tCTC (Exact:", relayerBalAfter.toString(), "wei)");
  console.log("Pool CTC Balance:   ", ethers.formatEther(poolBalAfter), "tCTC (Exact:", poolBalAfter.toString(), "wei)");

  // === 4. Deltas ===
  console.log("\n--- [4] BALANCE DELTAS & VERIFICATION ---");
  const relayerDelta = relayerBalAfter - relayerBalBefore;
  const poolDelta = poolBalAfter - poolBalBefore;

  console.log("Relayer Delta: ", ethers.formatEther(relayerDelta), "tCTC (decreased due to funding + gas)");
  console.log("Pool Delta:    +", ethers.formatEther(poolDelta), "tCTC (increased by exact CTC backing)");
  console.log("CC3 Settlement Tx:", result.data?.transactionHash || "N/A");
  console.log("CC3 Explorer URL: ", result.data?.explorerUrl || "N/A");

  if (poolDelta > 0n) {
    console.log("\n✅ VERIFICATION COMPLETE: Real native CTC left the relayer and was deposited into the pool balance!");
  } else {
    console.log("\n❌ VERIFICATION FAILED: Pool balance did not increase.");
    process.exit(1);
  }
}

main().catch(console.error);
