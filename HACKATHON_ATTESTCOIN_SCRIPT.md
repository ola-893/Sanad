# Sanad Protocol - BUIDL CTC 2026 Fall Pitch Script

## One-Line Positioning

Sanad is a Creditcoin CC3 credit and gold-backed microfinance protocol that uses Attestcoin to prove Ethereum transactions on CC3, turning real DeFi repayment history and Sepolia ETH funding events into on-chain credit, lending, and settlement logic without a centralized oracle or bridge.

## 3-Minute Demo Script

### 0:00-0:20 - Hook

"Across emerging markets, gold-backed pawnshops and Ar-Rahnu cooperatives already hold real collateral, but their capital is slow, local, and invisible to global liquidity. At the same time, a borrower may have years of clean Ethereum repayment history, but that history cannot safely follow them into a new lending market without trusting an API, oracle operator, or bridge.

Sanad fixes that on Creditcoin CC3."

### 0:20-0:50 - What Sanad Is

"Sanad is a Shariah-compliant RWA credit network. Pawnshops tokenize appraised gold as SAG collateral NFTs on CC3. Investors fund asset-backed loans. Borrowers repay without interest, using transparent Ujrah custody fees and Mudarabah-style capital sharing.

The hackathon-critical piece is Attestcoin. Sanad does not just display Ethereum history. It proves Ethereum transactions inside Creditcoin smart contracts, then lets CC3 business logic act on those facts."

### 0:50-1:35 - Attestcoin Integration

"Here is the flow.

First, the borrower connects an Ethereum wallet. Sanad discovers lending activity across Aave v3, Compound v3, Morpho Blue, Spark, MakerDAO, Euler, Fluid, Maple, Goldfinch, and Fraxlend.

Second, the backend builds Attestcoin proofs for those source transactions. For Ethereum Mainnet we use Attestcoin chainKey 3; for Sepolia demo gateway transactions we use chainKey 1.

Third, on CC3, `SanadCreditOracle.sol` calls the native BlockProver precompile at `0x0000000000000000000000000000000000000FD2`. The precompile verifies the Merkle inclusion proof and continuity proof. Only after that does our contract decode the proven EVM transaction bytes.

This is important: Sanad validates the target protocol contract, the function selector, borrower involvement, replay protection, receipt success where applicable, and calldata amount bounds. So a user cannot claim 'I repaid $50,000' using a transaction that actually repaid $50, or a transaction sent to the wrong contract."

### 1:35-2:10 - Live Borrower Demo

"Now watch the borrower credit bureau.

I open the borrower credit page, connect a wallet, and scan Ethereum history. Sanad finds real DeFi credit events. When I click auto-prove, the backend requests Attestcoin proof data and submits it to `SanadCreditOracle` on CC3.

Once CC3 verifies the proof, the borrower profile updates on-chain: total repaid volume, active borrow count, liquidation history, proven event count, credit score, and tier. That tier is then used by the financing engine to adjust LTV and risk policy for gold-backed loans.

So the score is not an off-chain AI opinion. It is a CC3 state transition caused by a verified Ethereum transaction."

### 2:10-2:45 - ETH-Only Cross-Chain Funding And Repayment

"Sanad also supports an ETH-only user journey.

Investors fund through the Sepolia `InvestorVault`. Borrowers repay through the Sepolia `RepaymentGateway`. The value moves as ETH on Ethereum Sepolia. Then Attestcoin proves those exact Sepolia transactions on CC3, and `SanadLiquidityPool.sol` records the corresponding loan funding, deposit, repayment, or return-distribution event.

We are precise about the trust model: Attestcoin proves facts; it does not magically teleport assets. In the demo, ETH stays on Sepolia and CC3 records verified accounting. That honesty is why the model can evolve into production settlement with decentralized pricing and liquidity routing without pretending a proof is a bridge."

### 2:45-3:00 - Close

"Sanad turns Creditcoin into the trust layer for real-world microfinance: Ethereum credit history, ETH payment activity, CC3 gold collateral NFTs, and Shariah-compliant lending rules all connected by Attestcoin proofs.

For BUIDL CTC, the protocol is not decorative. If you remove Attestcoin, Sanad loses its core product: trustless cross-chain credit."

## 5-Minute Judge Walkthrough

### 0:00-0:40 - Problem

"The lending world has two broken halves.

In the real world, pawnshops and Ar-Rahnu operators hold strong collateral: physical gold. But their liquidity is local, bank credit lines are slow, and borrowers do not build portable credit.

In DeFi, liquidity is global, but credit is mostly overcollateralized because protocols cannot safely import repayment history from another chain. If a lender trusts a centralized API, that is not decentralized credit. If it uses a bridge, it inherits bridge risk. Sanad uses Creditcoin CC3 and Attestcoin to create a third path."

### 0:40-1:20 - Product

"Sanad has three actors.

The borrower brings gold collateral and an Ethereum wallet history.

The pawnshop appraises the gold, performs compliance checks, and mints a SAG token on CC3. A SAG token is an ERC-721 collateral receipt for the appraised asset, loan terms, borrower, custodian, and lifecycle state.

The investor supplies capital into asset-backed opportunities. Depending on the flow, they can use native tCTC on CC3 or ETH through the Sepolia gateway."

### 1:20-2:30 - Attestcoin Technical Depth

"The core contract is `SanadCreditOracle.sol`, deployed on Creditcoin CC3.

It supports source chain keys 1 and 3: Sepolia and Ethereum Mainnet. When we submit a proof, the contract calls the Attestcoin BlockProver precompile at `0xFD2`. That precompile verifies transaction inclusion and source-chain continuity synchronously inside the CC3 transaction.

After verification, our code decodes the encoded EVM transaction chunks. It checks:

- the source transaction targets a registered DeFi protocol contract;
- the borrower is either the sender or appears in ABI-encoded calldata;
- the selector matches the claimed event type;
- stablecoin amounts are within a strict volume tolerance;
- each source transaction hash is processed once.

For batches, `submitBatchProof` verifies up to ten events under a shared continuity proof, matching the Attestcoin batch limit. The backend can also run owner-authorized auto-proving during KYC so a borrower does not need to sign every historical proof."

### 2:30-3:20 - Demo Flow

"In the UI, I go to the borrower credit page. The wallet scan shows Ethereum DeFi history across ten protocols. I start auto-prove.

Behind the scenes, the backend resolves the source block height, waits until Attestcoin has attested that block, fetches Merkle and continuity proof data, and submits the proof to CC3.

When the transaction confirms, we read the on-chain borrower profile from `SanadCreditOracle`: score, tier, clean repayments, active borrow count, total repaid volume, and proven events. That profile becomes the credit input to the gold financing engine."

### 3:20-4:10 - ETH Gateway Flow

"The second proof path is ETH-only.

An investor sends ETH to the Sepolia `InvestorVault` to deposit or fund a specific loan. A borrower sends ETH to the Sepolia `RepaymentGateway` to repay.

`SanadLiquidityPool.sol` on CC3 verifies those Sepolia transactions through Attestcoin using functions like `verifyAndRecordDeposit`, `verifyAndFundLoanCrossChain`, and `verifyAndSettleRepayment`.

The contract binds the proof to the exact gateway address, selector, token ID, amount, and receipt status. It also prevents replay. That means CC3 loan accounting only changes when the corresponding Ethereum transaction is cryptographically proven."

### 4:10-4:45 - Why Creditcoin

"Creditcoin is not just where we deployed. It is the reason this design works.

Attestcoin gives us decentralized cross-chain data verification at the smart contract layer. CC3 becomes the place where Ethereum history can underwrite real-world collateral. This directly matches the hackathon theme: real-world blockchain applications powered by Attestcoin, not centralized oracle assumptions."

### 4:45-5:00 - Closing

"Sanad makes cross-chain credit portable, asset-backed, and auditable. It starts with gold microfinance, but the primitive is broader: prove any Ethereum credit or payment event on CC3, then let local business logic price risk, release collateral, or settle obligations.

That is the Sanad thesis: real collateral, real Ethereum history, and real Attestcoin verification on Creditcoin."

## Demo Click Path

1. Open the homepage and state the product: Creditcoin CC3 gold-backed microfinance.
2. Go to `/dashboard/borrower/credit`.
3. Connect or paste a curated borrower wallet.
4. Click discovery/scan to show Ethereum DeFi events.
5. Click auto-prove to submit Attestcoin proof to CC3.
6. Show the updated on-chain profile: score, tier, proven events, total repaid.
7. Open the CC3 Blockscout transaction for the proof.
8. Switch to investor/funding flow.
9. Show Sepolia ETH gateway transaction.
10. Show CC3 proof settlement transaction.
11. Close on the trust model: Attestcoin proves the ETH transaction; CC3 executes Sanad business logic.

## Short Submission Description

Sanad Protocol is a Creditcoin CC3 RWA credit network for Shariah-compliant gold-backed microfinance. It uses the Attestcoin Protocol as its core trust primitive: Ethereum Mainnet and Sepolia transactions are proven on CC3 through the native BlockProver precompile, then decoded by Sanad smart contracts to update borrower credit profiles, record ETH funding and repayment events, and govern SAG gold collateral loans. Sanad supports Ethereum DeFi credit discovery across ten lending protocols, replay-protected CC3 proof settlement, tokenized gold collateral NFTs, compliance controls, and transparent non-riba financing flows.

## Technical Claims To Emphasize

- Attestcoin is load-bearing: without it, Sanad cannot trustlessly import Ethereum credit history or Sepolia ETH settlement facts.
- `SanadCreditOracle.sol` verifies source transactions on CC3 through `BlockProver` at `0xFD2`.
- Source chain coverage includes Ethereum Mainnet via chainKey 3 and Sepolia via chainKey 1.
- The oracle validates transaction target, borrower involvement, selector, volume bounds, and replay protection after proof verification.
- `SanadLiquidityPool.sol` separately verifies Sepolia ETH deposit, funding, repayment, and return-distribution transactions.
- Sanad does not claim Attestcoin bridges funds. It uses Attestcoin to prove transaction facts and CC3 contracts to execute accounting and risk logic.
- The product connects a real-world asset use case, physical gold collateral, with cross-chain DeFi credit history and ETH-based user flows.

## Contract Addresses From Current Repo Config

- CC3 `SanadCreditOracle`: `0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5`
- CC3 `SanadLiquidityPool`: `0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316`
- CC3 `SAGToken`: `0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9`
- Sepolia `InvestorVault`: `0x0e243c2F556eFaDA6352f567AA658b6052F04eD4`
- Sepolia `RepaymentGateway`: `0x662e21FfB91F35A1f16983e38a9cDAe90f537A80`

## Backup 30-Second Version

"Sanad is a Creditcoin CC3 protocol for gold-backed microfinance. Borrowers bring physical gold collateral; pawnshops mint SAG collateral NFTs; investors fund loans; and Attestcoin makes the cross-chain trust work. We prove Ethereum Mainnet DeFi repayment history and Sepolia ETH payment transactions directly inside CC3 contracts using the native `0xFD2` BlockProver. After verification, Sanad decodes the transaction bytes, checks the target contract, selector, borrower, amount, receipt status, and replay protection, then updates credit scores or loan accounting on-chain. It is not a bridge and not an API oracle. It is verified Ethereum activity becoming Creditcoin business logic."
