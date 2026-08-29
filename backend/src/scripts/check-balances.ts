import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const cc3 = new ethers.JsonRpcProvider(
    "https://rpc.cc3-testnet.creditcoin.network",
    102031,
    { staticNetwork: ethers.Network.from(102031) }
  );
  const pk = process.env.PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY;
  if (!pk) throw new Error("No private key found");
  const wallet = new ethers.Wallet(pk, cc3);
  const poolAddr = "0x0Ba0B4cecb4c5Ad16043744b504059E95b1fCE70";

  const [relayerBal, poolBal] = await Promise.all([
    cc3.getBalance(wallet.address),
    cc3.getBalance(poolAddr),
  ]);

  console.log("=== PRE-TEST BALANCES ===");
  console.log("Relayer wallet:", wallet.address);
  console.log("Relayer CTC balance:", ethers.formatEther(relayerBal), "tCTC");
  console.log("Pool contract:", poolAddr);
  console.log("Pool CTC balance:", ethers.formatEther(poolBal), "tCTC");
}

main().catch(console.error);
