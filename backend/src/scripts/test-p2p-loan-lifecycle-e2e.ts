import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";
import { proofProvider } from "@gluwa/usc-sdk";
import { DEPLOYED_ADDRESSES } from "../config/deployed-addresses.js";

dotenv.config();

const CC3_CHAIN_ID = 102031;
const SEPOLIA_CHAIN_ID = 11155111;
const CC3_RPC = process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const PROOF_BUILDER_URL = process.env.CREDITCOIN_PROOF_BUILDER_URL || "https://prover.cc3-testnet.creditcoin.network";

const FRESH_DEPLOY = process.argv.includes("--fresh-deploy");

// ABIs shared between fresh-deploy and deployed modes
const INVESTOR_VAULT_ABI = [
  "function deposit(uint256 amount) external payable",
  "function fundLoan(uint256 tokenId, address pawnshop, uint256 appraisedValueUSD) external payable",
  "function disburseLoan(uint256 tokenId, address borrower, uint256 amount) external payable",
  "function loanFunders(uint256 tokenId) external view returns (address)",
  "function loanPawnshops(uint256 tokenId) external view returns (address)",
  "function loanAppraisedValue(uint256 tokenId) external view returns (uint256)",
  "function loanDisbursed(uint256 tokenId) external view returns (bool)",
  "event DepositMade(address indexed investor, uint256 amount, uint256 timestamp)",
  "event LoanFunded(uint256 indexed tokenId, address indexed investor, address indexed pawnshop, uint256 amount, uint256 appraisedValueUSD, uint256 timestamp)",
  "event LoanDisbursed(uint256 indexed tokenId, address indexed pawnshop, address indexed borrower, uint256 amount, uint256 appraisedValueUSD, uint256 timestamp)",
];

const REPAYMENT_GATEWAY_ABI = [
  "function repay(uint256 tokenId, uint256 amount) external payable",
  "function settleInvestor(uint256 tokenId, uint256 amount) external payable",
  "function totalRepaidForToken(uint256 tokenId) external view returns (uint256)",
  "function investorVaultAddress() external view returns (address)",
  "event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp)",
  "event InvestorSettled(uint256 indexed tokenId, address indexed pawnshop, address indexed investor, uint256 amount, uint256 timestamp)",
];

const SAG_TOKEN_ABI = [
  "function mintCollateral(tuple(address pawnshop, address borrower, uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, uint256 tenureDays, uint256 monthlyUjrahUSD, string ipfsUri) params) external returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function grantRole(bytes32 role, address account) external",
];

const LIQUIDITY_POOL_ABI = [
  "function depositLiquidity() external payable",
  "function setInvestorVaultAddress(address _investorVault) external",
  "function setRepaymentGatewayAddress(address _repaymentGateway) external",
  "function totalPoolLiquidity() external view returns (uint256)",
  "function tokenLoanBalance(uint256 tokenId) external view returns (uint256)",
  "function loanInvestors(uint256 tokenId) external view returns (address)",
  "function investorTotalProvenCapital(address investor) external view returns (uint256)",
  "function verifyAndFundLoanCrossChain(uint256 tokenId, uint64 chainKey, uint64 headerNumber, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, bytes32 sourceTxHash) external returns (bool)",
];

function findImports(importPath: string) {
  let fullPath: string;
  if (importPath.startsWith("@openzeppelin/")) {
    fullPath = path.resolve(process.cwd(), "node_modules", importPath);
  } else {
    fullPath = path.resolve(process.cwd(), "src", "contracts", importPath);
  }

  try {
    const contents = fs.readFileSync(fullPath, "utf8");
    return { contents };
  } catch (e: any) {
    return { error: "File not found: " + fullPath + " (" + e.message + ")" };
  }
}

function compileAll() {
  console.log("\n[1/7] Compiling CC3 & Sepolia smart contracts...");
  const contractsDir = path.resolve(process.cwd(), "src", "contracts");
  const sepoliaDir = path.resolve(contractsDir, "sepolia");

  // CC3 Contracts
  const cc3Sources: Record<string, { content: string }> = {
    "SAGToken.sol": { content: fs.readFileSync(path.join(contractsDir, "SAGToken.sol"), "utf8") },
    "SanadLiquidityPool.sol": { content: fs.readFileSync(path.join(contractsDir, "SanadLiquidityPool.sol"), "utf8") },
    "SanadCreditOracle.sol": { content: fs.readFileSync(path.join(contractsDir, "SanadCreditOracle.sol"), "utf8") },
  };

  const cc3Input = {
    language: "Solidity",
    sources: cc3Sources,
    settings: {
      evmVersion: "cancun",
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] } },
    },
  };

  const cc3Output = JSON.parse(solc.compile(JSON.stringify(cc3Input), { import: findImports }));
  if (cc3Output.errors) {
    const fatal = cc3Output.errors.filter((e: any) => e.severity === "error");
    if (fatal.length > 0) throw new Error("CC3 Compilation failed: " + fatal.map((e: any) => e.formattedMessage).join("\n"));
  }

  // Sepolia Contracts
  const sepoliaSources: Record<string, { content: string }> = {
    "InvestorVault.sol": { content: fs.readFileSync(path.join(sepoliaDir, "InvestorVault.sol"), "utf8") },
    "RepaymentGateway.sol": { content: fs.readFileSync(path.join(sepoliaDir, "RepaymentGateway.sol"), "utf8") },
  };

  const sepoliaInput = {
    language: "Solidity",
    sources: sepoliaSources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] } },
    },
  };

  const sepoliaOutput = JSON.parse(solc.compile(JSON.stringify(sepoliaInput)));
  if (sepoliaOutput.errors) {
    const fatal = sepoliaOutput.errors.filter((e: any) => e.severity === "error");
    if (fatal.length > 0) throw new Error("Sepolia Compilation failed: " + fatal.map((e: any) => e.formattedMessage).join("\n"));
  }

  return {
    SAGToken: cc3Output.contracts["SAGToken.sol"]["SAGToken"],
    SanadLiquidityPool: cc3Output.contracts["SanadLiquidityPool.sol"]["SanadLiquidityPool"],
    SanadCreditOracle: cc3Output.contracts["SanadCreditOracle.sol"]["SanadCreditOracle"],
    InvestorVault: sepoliaOutput.contracts["InvestorVault.sol"]["InvestorVault"],
    RepaymentGateway: sepoliaOutput.contracts["RepaymentGateway.sol"]["RepaymentGateway"],
  };
}

/**
 * Deploy fresh contracts (only when --fresh-deploy flag is passed).
 */
async function freshDeploy(adminCC3: ethers.Wallet, adminSepolia: ethers.Wallet, cc3Provider: ethers.JsonRpcProvider) {
  const compiled = compileAll();

  console.log("\n[2/7] Deploying Fresh Protocol Contracts on Creditcoin CC3 & Sepolia...");
  const oracleFactory = new ethers.ContractFactory(compiled.SanadCreditOracle.abi, compiled.SanadCreditOracle.evm.bytecode.object, adminCC3);
  const oracleContract = await oracleFactory.deploy();
  await oracleContract.waitForDeployment();
  const oracleAddr = await oracleContract.getAddress();
  console.log("  ✅ SanadCreditOracle deployed at: " + oracleAddr);

  const sagFactory = new ethers.ContractFactory(compiled.SAGToken.abi, compiled.SAGToken.evm.bytecode.object, adminCC3);
  const sagContract = await sagFactory.deploy();
  await sagContract.waitForDeployment();
  const sagAddr = await sagContract.getAddress();
  console.log("  ✅ SAGToken deployed at:           " + sagAddr);

  const poolFactory = new ethers.ContractFactory(compiled.SanadLiquidityPool.abi, compiled.SanadLiquidityPool.evm.bytecode.object, adminCC3);
  const poolContract = await poolFactory.deploy(sagAddr);
  await poolContract.waitForDeployment();
  const poolAddr = await poolContract.getAddress();
  console.log("  ✅ SanadLiquidityPool deployed at: " + poolAddr);

  // Grant roles on SAGToken
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const SETTLEMENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLEMENT_ROLE"));
  const COMPLIANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_ROLE"));

  await (await (sagContract as any).grantRole(MINTER_ROLE, adminCC3.address)).wait();
  await (await (sagContract as any).grantRole(MINTER_ROLE, poolAddr)).wait();
  await (await (sagContract as any).grantRole(SETTLEMENT_ROLE, poolAddr)).wait();
  await (await (sagContract as any).grantRole(COMPLIANCE_ROLE, adminCC3.address)).wait();
  console.log("  ✅ Granted SAGToken roles to Pool and Admin");

  // Deploy Sepolia Gateways
  const treasuryAddress = adminSepolia.address;
  const vaultFactory = new ethers.ContractFactory(compiled.InvestorVault.abi, compiled.InvestorVault.evm.bytecode.object, adminSepolia);
  const vaultContract = await vaultFactory.deploy(treasuryAddress);
  await vaultContract.waitForDeployment();
  const vaultAddr = await vaultContract.getAddress();
  console.log("  ✅ InvestorVault deployed at:     " + vaultAddr);

  const repayFactory = new ethers.ContractFactory(compiled.RepaymentGateway.abi, compiled.RepaymentGateway.evm.bytecode.object, adminSepolia);
  const repayContract = await repayFactory.deploy(treasuryAddress, vaultAddr);
  await repayContract.waitForDeployment();
  const repayAddr = await repayContract.getAddress();
  console.log("  ✅ RepaymentGateway deployed at:   " + repayAddr);

  // Connect Sepolia addresses into CC3 Pool
  await (await (poolContract as any).setInvestorVaultAddress(vaultAddr)).wait();
  await (await (poolContract as any).setRepaymentGatewayAddress(repayAddr)).wait();
  console.log("  ✅ Configured Sepolia gateways on SanadLiquidityPool");

  // Baseline CC3 deposit
  const baselineDeposit = ethers.parseEther("5.0");
  await (await (poolContract as any).depositLiquidity({ value: baselineDeposit })).wait();
  console.log("  ✅ Deposited 5.0 tCTC native liquidity into CC3 pool for baseline accounting");

  return { sagAddr, poolAddr, oracleAddr, vaultAddr, repayAddr, sagContract, poolContract, vaultContract, repayContract, compiled };
}

async function main() {
  console.log("========================================================================");
  console.log("🚀 PEER-TO-PEER CROSS-CHAIN 3-PARTY 4-HOP LOAN LIFECYCLE E2E TEST");
  console.log("   (Investor -> Pawnshop -> Borrower -> Pawnshop -> Investor)");
  if (FRESH_DEPLOY) {
    console.log("   ⚠️  MODE: --fresh-deploy (deploying new contracts)");
  } else {
    console.log("   MODE: Using deployed contracts from deployed-addresses.ts");
  }
  console.log("========================================================================");

  const pkAdmin = process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY!;

  const cc3Provider = new ethers.JsonRpcProvider(CC3_RPC, CC3_CHAIN_ID, { staticNetwork: ethers.Network.from(CC3_CHAIN_ID) });
  const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC, SEPOLIA_CHAIN_ID, { staticNetwork: ethers.Network.from(SEPOLIA_CHAIN_ID) });

  const adminCC3 = new ethers.Wallet(pkAdmin, cc3Provider);
  const adminSepolia = new ethers.Wallet(pkAdmin, sepoliaProvider);

  // Generate 3 clean, dedicated ephemeral wallets: Investor, Pawnshop, Borrower
  const investorWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, sepoliaProvider);
  const pawnshopWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, sepoliaProvider);
  const borrowerWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, sepoliaProvider);

  console.log("\n• Admin Wallet (Rotated & Secure): " + adminCC3.address);
  console.log("• Party 1: Investor Wallet:        " + investorWallet.address);
  console.log("• Party 2: Pawnshop Wallet:        " + pawnshopWallet.address);
  console.log("• Party 3: Borrower Wallet:        " + borrowerWallet.address);

  // Fund ephemeral wallets on Sepolia
  console.log("\nFunding Ephemeral Wallets on Sepolia...");
  const fundInvestorTx = await adminSepolia.sendTransaction({
    to: investorWallet.address,
    value: ethers.parseEther("0.005"),
  });
  await fundInvestorTx.wait();
  console.log("  ✅ Investor funded with 0.005 ETH (Tx: " + fundInvestorTx.hash + ")");

  const fundPawnshopTx = await adminSepolia.sendTransaction({
    to: pawnshopWallet.address,
    value: ethers.parseEther("0.005"),
  });
  await fundPawnshopTx.wait();
  console.log("  ✅ Pawnshop funded with 0.005 ETH (Tx: " + fundPawnshopTx.hash + ")");

  const fundBorrowerTx = await adminSepolia.sendTransaction({
    to: borrowerWallet.address,
    value: ethers.parseEther("0.005"),
  });
  await fundBorrowerTx.wait();
  console.log("  ✅ Borrower funded with 0.005 ETH (Tx: " + fundBorrowerTx.hash + ")");

  // Resolve contract addresses — either fresh deploy or from source-of-truth
  let sagAddr: string, poolAddr: string, vaultAddr: string, repayAddr: string;
  let sagContract: ethers.Contract, poolContract: ethers.Contract;

  if (FRESH_DEPLOY) {
    const result = await freshDeploy(adminCC3, adminSepolia, cc3Provider);
    sagAddr = result.sagAddr;
    poolAddr = result.poolAddr;
    vaultAddr = result.vaultAddr;
    repayAddr = result.repayAddr;
    sagContract = new ethers.Contract(sagAddr, SAG_TOKEN_ABI, adminCC3);
    poolContract = new ethers.Contract(poolAddr, LIQUIDITY_POOL_ABI, adminCC3);
  } else {
    // Read from deployed-addresses.ts (source of truth)
    sagAddr = process.env.SAG_TOKEN_ADDRESS || DEPLOYED_ADDRESSES.cc3.sagToken;
    poolAddr = process.env.SANAD_LIQUIDITY_POOL_ADDRESS || DEPLOYED_ADDRESSES.cc3.liquidityPool;
    vaultAddr = process.env.SEPOLIA_INVESTOR_VAULT_ADDRESS || DEPLOYED_ADDRESSES.sepolia.investorVault;
    repayAddr = process.env.SEPOLIA_REPAYMENT_GATEWAY_ADDRESS || DEPLOYED_ADDRESSES.sepolia.repaymentGateway;

    if (sagAddr === '0x0000000000000000000000000000000000000000') {
      throw new Error("deployed-addresses.ts has placeholder addresses. Run deploy-all.ts first, or pass --fresh-deploy.");
    }

    console.log("\n[1/7] Using Deployed Contracts (source of truth):");
    console.log("  • CC3 SAGToken:           " + sagAddr);
    console.log("  • CC3 LiquidityPool:      " + poolAddr);
    console.log("  • Sepolia InvestorVault:   " + vaultAddr);
    console.log("  • Sepolia RepaymentGateway:" + repayAddr);

    sagContract = new ethers.Contract(sagAddr, SAG_TOKEN_ABI, adminCC3);
    poolContract = new ethers.Contract(poolAddr, LIQUIDITY_POOL_ABI, adminCC3);
  }

  // 4. STEP 1: Mint SAG Collateral in ActivePledged (Awaiting Funding)
  console.log("\n[3/7] STEP 1: Minting SAG Gold Collateral Note on CC3 (Awaiting Funding)...");
  const appraisedValueUSD = ethers.parseUnits("3500", 6); // 3,500,000,000 (6 decimals per SAGToken specification)
  const loanPrincipalUSD = ethers.parseUnits("2500", 6);
  const monthlyUjrahUSD = ethers.parseUnits("25", 6);
  const mintParams = {
    pawnshop: pawnshopWallet.address,
    borrower: borrowerWallet.address,
    weightGrams: 5000, // 50.00g (2 decimals)
    karat: 24,
    appraisedValueUSD: appraisedValueUSD,
    loanAmount: loanPrincipalUSD,
    tenureDays: 30,
    monthlyUjrahUSD: monthlyUjrahUSD,
    ipfsUri: "ipfs://QmP2PLoanTestCollateralMetadata",
  };

  const mintTx = await (sagContract as any).mintCollateral(mintParams);
  const mintReceipt = await mintTx.wait();

  // Determine tokenId from Transfer event log (instead of assuming 1)
  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  let tokenId = 1n;
  for (const log of mintReceipt.logs) {
    if (log.topics[0] === transferTopic && log.topics.length >= 4) {
      tokenId = BigInt(log.topics[3]);
      break;
    }
  }
  console.log("  ✅ Minted SAG Collateral Token ID: #" + tokenId);
  console.log("     Pawnshop: " + pawnshopWallet.address + " | Borrower: " + borrowerWallet.address);
  console.log("     Appraised Value USD (6 decimals): " + appraisedValueUSD + " ($3,500.00 USD) | Loan Principal: " + loanPrincipalUSD);

  // 5. STEP 2: Hop 1 (Investor -> Pawnshop on Sepolia)
  console.log("\n[4/7] STEP 2: HOP 1 - Investor Directly Funds Pawnshop on Sepolia...");
  const fundingAmountWei = ethers.parseEther("0.001"); // 0.001 ETH
  const pawnshopBalBeforeHop1 = await sepoliaProvider.getBalance(pawnshopWallet.address);
  const treasuryAddress = adminSepolia.address;
  const treasuryBalBeforeHop1 = await sepoliaProvider.getBalance(treasuryAddress);

  console.log("  • Pawnshop Sepolia Balance Before Hop 1: " + ethers.formatEther(pawnshopBalBeforeHop1) + " ETH");
  console.log("  • Calling InvestorVault.fundLoan(tokenId: " + tokenId + ", pawnshop: " + pawnshopWallet.address + ", appraisedUSD: " + appraisedValueUSD + ")...");

  const vaultWithInvestor = new ethers.Contract(vaultAddr, INVESTOR_VAULT_ABI, investorWallet);
  const fundTx = await (vaultWithInvestor as any).fundLoan(tokenId, pawnshopWallet.address, appraisedValueUSD, {
    value: fundingAmountWei,
  });
  console.log("  • Broadcast Sepolia Funding Tx: " + fundTx.hash);
  const fundReceipt = await fundTx.wait();
  console.log("  ✅ Sepolia Funding Confirmed in Block #" + fundReceipt.blockNumber + "!");

  const pawnshopBalAfterHop1 = await sepoliaProvider.getBalance(pawnshopWallet.address);
  const treasuryBalAfterHop1 = await sepoliaProvider.getBalance(treasuryAddress);

  const hop1PawnshopDelta = pawnshopBalAfterHop1 - pawnshopBalBeforeHop1;
  const hop1TreasuryDelta = treasuryBalAfterHop1 - treasuryBalBeforeHop1;

  console.log("  • Pawnshop Balance Delta (Hop 1): +" + ethers.formatEther(hop1PawnshopDelta) + " ETH");
  console.log("  • Treasury Balance Delta (Hop 1): +" + ethers.formatEther(hop1TreasuryDelta) + " ETH");

  if (hop1PawnshopDelta !== fundingAmountWei) {
    throw new Error("Hop 1 Failure: Pawnshop did not receive exact funding amount in same transaction!");
  }
  if (hop1TreasuryDelta !== 0n) {
    throw new Error("Hop 1 Failure: Treasury balance changed during peer-to-peer pawnshop funding!");
  }

  const vaultRead = new ethers.Contract(vaultAddr, INVESTOR_VAULT_ABI, sepoliaProvider);
  const recordedFunder = await (vaultRead as any).loanFunders(tokenId);
  const recordedPawnshop = await (vaultRead as any).loanPawnshops(tokenId);
  const recordedAppraisal = await (vaultRead as any).loanAppraisedValue(tokenId);

  console.log("  • InvestorVault.loanFunders(" + tokenId + "):       " + recordedFunder);
  console.log("  • InvestorVault.loanPawnshops(" + tokenId + "):     " + recordedPawnshop);
  console.log("  • InvestorVault.loanAppraisedValue(" + tokenId + "): " + recordedAppraisal);

  if (recordedFunder.toLowerCase() !== investorWallet.address.toLowerCase()) {
    throw new Error("loanFunders on Sepolia does not match investor address!");
  }
  if (recordedPawnshop.toLowerCase() !== pawnshopWallet.address.toLowerCase()) {
    throw new Error("loanPawnshops on Sepolia does not match pawnshop address!");
  }
  if (BigInt(recordedAppraisal) !== BigInt(appraisedValueUSD)) {
    throw new Error("loanAppraisedValue on Sepolia does not match audit valuation!");
  }
  console.log("  ✅ HOP 1 VERIFIED: Value moved directly from Investor to Pawnshop with full audit trail!");

  // 6. STEP 3: Cryptographic Proof & CC3 Settlement (verifyAndFundLoanCrossChain)
  console.log("\n[5/7] STEP 3: Requesting Attestcoin Proof & Verifying on CC3 (verifyAndFundLoanCrossChain)...");
  console.log("  • Waiting for Sepolia block #" + fundReceipt.blockNumber + " to be attested in Prover cache...");

  const ProofBuilder = (proofProvider as any).service?.ProofBuilder || (proofProvider as any).ProofBuilder;
  const proofBuilder = new ProofBuilder(1, PROOF_BUILDER_URL);
  await proofBuilder.waitUntilHeightAttested(1, fundReceipt.blockNumber, 10000, 600000, 3000);
  const proofResult = await proofBuilder.getProof(fundTx.hash);
  if (!proofResult?.success || !proofResult.data) {
    throw new Error("Failed to obtain Attestcoin proof: " + proofResult?.error);
  }
  const proofData = proofResult.data;

  console.log("  ✅ Block #" + fundReceipt.blockNumber + " Attestcoin Proof Generated!");

  // CC3 state before
  const poolBalBefore = await cc3Provider.getBalance(poolAddr);
  const poolLiqBefore = await (poolContract as any).totalPoolLiquidity();
  const tokenLoanBalBefore = await (poolContract as any).tokenLoanBalance(tokenId);

  console.log("  • Calling verifyAndFundLoanCrossChain on CC3...");
  const txBytes = proofData.txBytes || proofData.encodedTransaction;
  const verifyTx = await (poolContract as any).verifyAndFundLoanCrossChain(
    tokenId,
    proofData.chainKey,
    proofData.headerNumber,
    txBytes,
    proofData.merkleProof,
    proofData.continuityProof,
    fundTx.hash
  );
  const verifyReceipt = await verifyTx.wait();
  console.log("  ✅ CC3 Settlement Confirmed in Block #" + verifyReceipt.blockNumber + "!");

  // CC3 state after
  const poolBalAfter = await cc3Provider.getBalance(poolAddr);
  const poolLiqAfter = await (poolContract as any).totalPoolLiquidity();
  const tokenLoanBalAfter = await (poolContract as any).tokenLoanBalance(tokenId);
  const loanInvestorCC3 = await (poolContract as any).loanInvestors(tokenId);
  const investorProvenCap = await (poolContract as any).investorTotalProvenCapital(investorWallet.address);

  console.log("  • CC3 tokenLoanBalance:         " + tokenLoanBalAfter.toString() + " wei");
  console.log("  • CC3 loanInvestors(" + tokenId + "):         " + loanInvestorCC3);
  console.log("  • CC3 investorTotalProvenCapital: " + investorProvenCap.toString() + " units");

  if (poolBalAfter !== poolBalBefore || poolLiqAfter !== poolLiqBefore) {
    throw new Error("CRITICAL REGRESSION: Pool native balance or totalPoolLiquidity changed during cross-chain loan funding!");
  }
  console.log("  ✅ CRITICAL VERIFICATION PASSED: Pool balance untouched (Zero CTC Leakage)!");

  // 7. STEP 4: Hop 2 (Pawnshop -> Borrower Disbursement on Sepolia)
  console.log("\n[6/7] STEP 4: HOP 2 - Pawnshop Disburses Funds to Borrower on Sepolia...");
  const borrowerBalBeforeHop2 = await sepoliaProvider.getBalance(borrowerWallet.address);
  console.log("  • Borrower Sepolia Balance Before Hop 2: " + ethers.formatEther(borrowerBalBeforeHop2) + " ETH");

  const vaultWithPawnshop = new ethers.Contract(vaultAddr, INVESTOR_VAULT_ABI, pawnshopWallet);
  const disburseTx = await (vaultWithPawnshop as any).disburseLoan(tokenId, borrowerWallet.address, fundingAmountWei, {
    value: fundingAmountWei,
  });
  console.log("  • Broadcast Sepolia Disbursement Tx: " + disburseTx.hash);
  const disburseReceipt = await disburseTx.wait();
  console.log("  ✅ Sepolia Disbursement Confirmed in Block #" + disburseReceipt.blockNumber + "!");

  const borrowerBalAfterHop2 = await sepoliaProvider.getBalance(borrowerWallet.address);
  const hop2BorrowerDelta = borrowerBalAfterHop2 - borrowerBalBeforeHop2;
  console.log("  • Borrower Balance Delta (Hop 2): +" + ethers.formatEther(hop2BorrowerDelta) + " ETH");

  if (hop2BorrowerDelta !== fundingAmountWei) {
    throw new Error("Hop 2 Failure: Borrower did not receive exact disbursement amount!");
  }
  const isDisbursed = await (vaultRead as any).loanDisbursed(tokenId);
  if (!isDisbursed) {
    throw new Error("Hop 2 Failure: loanDisbursed is false on InvestorVault!");
  }
  console.log("  ✅ HOP 2 VERIFIED: Funds disbursed directly from Pawnshop to Borrower!");

  // 8. STEP 5 & 6: Hop 3 & Hop 4 (Repayment: Borrower -> Pawnshop -> Investor)
  console.log("\n[7/7] STEP 5 & 6: HOP 3 & HOP 4 - Borrower Repayment & Pawnshop Investor Settlement...");
  
  // Hop 3: Borrower -> Pawnshop via RepaymentGateway.repay
  console.log("\n  --- HOP 3: Borrower -> Pawnshop via RepaymentGateway.repay ---");
  const pawnshopBalBeforeHop3 = await sepoliaProvider.getBalance(pawnshopWallet.address);
  const treasuryBalBeforeHop3 = await sepoliaProvider.getBalance(treasuryAddress);

  const repayWithBorrower = new ethers.Contract(repayAddr, REPAYMENT_GATEWAY_ABI, borrowerWallet);
  const repayTx = await (repayWithBorrower as any).repay(tokenId, fundingAmountWei, {
    value: fundingAmountWei,
  });
  console.log("  • Broadcast Sepolia Repayment Tx: " + repayTx.hash);
  const repayReceipt = await repayTx.wait();
  console.log("  ✅ Sepolia Repayment Confirmed in Block #" + repayReceipt.blockNumber + "!");

  const pawnshopBalAfterHop3 = await sepoliaProvider.getBalance(pawnshopWallet.address);
  const treasuryBalAfterHop3 = await sepoliaProvider.getBalance(treasuryAddress);

  const hop3PawnshopDelta = pawnshopBalAfterHop3 - pawnshopBalBeforeHop3;
  const hop3TreasuryDelta = treasuryBalAfterHop3 - treasuryBalBeforeHop3;

  console.log("  • Pawnshop Balance Delta (Hop 3): +" + ethers.formatEther(hop3PawnshopDelta) + " ETH");
  console.log("  • Treasury Balance Delta (Hop 3): +" + ethers.formatEther(hop3TreasuryDelta) + " ETH");

  if (hop3PawnshopDelta !== fundingAmountWei) {
    throw new Error("Hop 3 Failure: Pawnshop did not receive exact repayment funds!");
  }
  if (hop3TreasuryDelta !== 0n) {
    throw new Error("Hop 3 Failure: Treasury balance changed during borrower-to-pawnshop repayment!");
  }
  console.log("  ✅ HOP 3 VERIFIED: Targeted repayment successfully routed from Borrower to Pawnshop!");

  // Hop 4: Pawnshop -> Investor via RepaymentGateway.settleInvestor
  console.log("\n  --- HOP 4: Pawnshop -> Investor via RepaymentGateway.settleInvestor ---");
  const investorBalBeforeHop4 = await sepoliaProvider.getBalance(investorWallet.address);
  const treasuryBalBeforeHop4 = await sepoliaProvider.getBalance(treasuryAddress);

  const repayWithPawnshop = new ethers.Contract(repayAddr, REPAYMENT_GATEWAY_ABI, pawnshopWallet);
  const settleTx = await (repayWithPawnshop as any).settleInvestor(tokenId, fundingAmountWei, {
    value: fundingAmountWei,
  });
  console.log("  • Broadcast Sepolia Settle Investor Tx: " + settleTx.hash);
  const settleReceipt = await settleTx.wait();
  console.log("  ✅ Sepolia Settle Investor Confirmed in Block #" + settleReceipt.blockNumber + "!");

  const investorBalAfterHop4 = await sepoliaProvider.getBalance(investorWallet.address);
  const treasuryBalAfterHop4 = await sepoliaProvider.getBalance(treasuryAddress);

  const hop4InvestorDelta = investorBalAfterHop4 - investorBalBeforeHop4;
  const hop4TreasuryDelta = treasuryBalAfterHop4 - treasuryBalBeforeHop4;

  console.log("  • Investor Balance Delta (Hop 4): +" + ethers.formatEther(hop4InvestorDelta) + " ETH");
  console.log("  • Treasury Balance Delta (Hop 4): +" + ethers.formatEther(hop4TreasuryDelta) + " ETH");

  if (hop4InvestorDelta !== fundingAmountWei) {
    throw new Error("Hop 4 Failure: Investor did not receive exact settlement funds!");
  }
  if (hop4TreasuryDelta !== 0n) {
    throw new Error("Hop 4 Failure: Treasury balance changed during pawnshop-to-investor settlement!");
  }
  console.log("  ✅ HOP 4 VERIFIED: Pawnshop successfully settled funding Investor on-chain!");

  console.log("\n========================================================================");
  console.log("🎉 3-PARTY 4-HOP CROSS-CHAIN LOAN LIFECYCLE 100% VERIFIED ON-CHAIN");
  console.log("========================================================================");
  console.log("1. CC3 SAG Collateral Note:            Token ID #" + tokenId);
  console.log("2. Hop 1 (Investor -> Pawnshop):       " + fundTx.hash);
  console.log("3. CC3 Cryptographic Settlement:       " + verifyTx.hash);
  console.log("4. Hop 2 (Pawnshop -> Borrower):       " + disburseTx.hash);
  console.log("5. Hop 3 (Borrower -> Pawnshop Repay): " + repayTx.hash);
  console.log("6. Hop 4 (Pawnshop -> Investor Settle):" + settleTx.hash);
  console.log("7. Pool Solvency & Isolation:          100% Preserved (0 CTC Leaked)");
  console.log("========================================================================");
}

main().catch((err) => {
  console.error("\n❌ E2E Test Failed:", err);
  process.exit(1);
});
