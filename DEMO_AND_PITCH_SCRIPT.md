# 🎬 Sanad Protocol — Hackathon Demo & Pitch Script

**Tagline**: *Trustless Cross-Chain Credit Scoring & Real-World Asset (RWA) Microfinance Powered by Creditcoin CC3 & Attestcoin.*

---

## ⏱️ Video / Presentation Outline (3 to 5 Minutes)

| Segment | Time | Screen / Visual Cue | Narrative Focus |
| :--- | :--- | :--- | :--- |
| **1. The Problem** | 0:00 – 0:45 | Slide 1: RWA Pawn Bottlenecks & Uncollateralized DeFi Gap | Fragmented credit history, overcollateralization, and pawnshop capital lockup |
| **2. The Solution** | 0:45 – 1:30 | Slide 2: Creditcoin CC3 Architecture Diagram | Sanad Protocol: Attestcoin BlockProver Precompile (`0xFD2`), Credit Oracle & SAG NFTs |
| **3. Live Demo: Borrower Flow** | 1:30 – 2:45 | UI: `/dashboard/borrower/credit` | Real DeFi discovery, Attestcoin proof generation, and CC3 score settlement |
| **4. Live Demo: Investor Flow** | 2:45 – 3:30 | UI: `/dashboard` (Investor) & `/dashboard/browse` | Native tCTC liquidity pool deposit, Mudarabah yield, and SAG collateral browsing |
| **5. Shariah Compliance & Conclusion** | 3:30 – 4:15 | Slide 3: Shariah Auction & Summary | Zero-Riba, asset-backed liquidation surplus return, and roadmap |

---

## 🎙️ Detailed Speaking Script & Demo Actions

### 1. The Hook & The Trillion-Dollar Dilemma (0:00 – 0:45)
> **[Speaker on Camera / Title Slide]**
>
> "In traditional finance, pawnshops and microfinance institutions across emerging markets hold billions in physical gold collateral. But their capital is locked: local pawnshops can only turn over their lending capital 3 to 4 times a year due to slow bank credit lines. Meanwhile, unbanked borrowers repay loans diligently without ever building a portable credit score.
>
> In Web3, undercollateralized lending is broken because decentralized credit history cannot be trustlessly verified across chains without centralized, manipulable oracles.
>
> Welcome to **Sanad Protocol (سند)**—the cross-chain RWA credit and microfinance network built on **Creditcoin 3 (CC3)**."

---

### 2. The Sanad Architecture on Creditcoin CC3 (0:45 – 1:30)
> **[Visual: Architecture Blueprint Diagram]**
>
> "Sanad combines three core innovations:
>
> 1. **Creditcoin Attestcoin BlockProver (`0xFD2`)**: Rather than trusting centralized third-party API oracles, Sanad uses Creditcoin's native cryptographic BlockProver precompile to verify historical Ethereum Sepolia and Mainnet transactions directly on-chain using Merkle inclusion and continuity proofs.
> 2. **Multi-Chain Sanad Credit Oracle (`SanadCreditOracle.sol`)**: Dynamically decodes EVM calldata across 10 leading lending protocols—detecting clean repayments, liquidations, defaults, and active borrow positions to generate non-custodial credit scores and tiers (Bronze, Silver, Gold).
> 3. **SAG Collateral Tokens & Shariah Liquidity Pools (`SanadLiquidityPool.sol`)**: Verified physical gold is minted as ERC-721 SAG notes, backed by an autonomous AI appraisal agent. Global investors supply native Creditcoin (tCTC) liquidity through a Shariah-compliant Mudarabah model."

---

### 3. Live Demo: Borrower Credit Bureau & Attestcoin Settlement (1:30 – 2:45)
> **[Action: Switch to Browser at `/dashboard/borrower/credit`]**
>
> *"Let’s watch the borrower journey in action."*
>
> 1. **Connect Wallet & Scan History**:
>    > "Here, a borrower connects their wallet. In one click, Sanad scans their cross-chain lending history across Aave, Spark, Morpho, Compound, Maker, and Euler."
> 2. **Attestcoin Proof Generation**:
>    > "Sanad discovers their active borrow position on Aave v3 Sepolia. We click **'Generate Attestcoin Proof'**. The backend queries the Creditcoin Attestcoin Prover, packaging the header block, transaction byte RLP, Merkle siblings, and continuity roots."
> 3. **Settlement on Creditcoin CC3**:
>    > "We click **'Submit Proof to Creditcoin Oracle'**. The transaction is broadcast to our deployed `SanadCreditOracle` on CC3 Testnet. The native `0xFD2` precompile cryptographically validates the proof on-chain."
> 4. **Instant Score & Tier Upgrade**:
>    > "Notice the borrower's on-chain profile immediately updates from *Unscored* to *Bronze (510)* with their active position recognized, unlocking lower interest and higher LTV borrowing limits."
>
> **[Display Blockscout Tx Link]**:
> *"Here is the live settlement on Creditcoin Blockscout: [`0xc29da4c8...`](https://creditcoin-testnet.blockscout.com/tx/0xc29da4c8fbb842c071092a894ae6374b394d4e9c8298ffae5fde42af889ec924)."*

---

### 4. Live Demo: Investor Liquidity Pool & SAG Gold Collateral (2:45 – 3:30)
> **[Action: Switch to Browser at `/dashboard` (Investor View)]**
>
> *"Now let's switch to the investor experience."*
>
> 1. **Supply Liquidity in Native tCTC**:
>    > "On the Investor Dashboard, global capital providers see the live Creditcoin CC3 pool statistics. We select **'+5 CTC'** and click **'Deposit Liquidity'**."
> 2. **Direct Payable Execution**:
>    > "This is a direct payable transaction to `SanadLiquidityPool`—no clunky ERC-20 approval transactions required. MetaMask confirms on Creditcoin CC3, and our stake and share of the pool increase instantly."
> 3. **Browse Asset-Backed SAG Notes (`/dashboard/browse`)**:
>    > "Investors can browse tokenized gold collateral notes (SAGs) originated by certified Ar-Rahnu pawnshops, complete with weight, karat purity, AI valuation reports, and real-time LTV risk tiers."

---

### 5. Shariah Governance, Impact & Closing (3:30 – 4:15)
> **[Slide / Dashboard: Compliance & Audit Logs]**
>
> "Sanad is built strictly adhering to Islamic commercial jurisprudence (*Fiqh al-Mu'amalat*):
> - **Zero Riba**: Profit sharing through transparent *Mudarabah* and *Ujrah* custody fees.
> - **Ethical Liquidation**: If a default occurs, collateral enters a transparent Dutch auction. Any surplus proceeds beyond principal and accrued fees are **returned directly to the borrower**, strictly prohibiting predatory forfeiture.
> - **Full Observability**: Every mint, freeze, repayment, and liquidation emits immutable on-chain audit logs on Creditcoin.
>
> By uniting Creditcoin’s cryptographic Attestcoin engine with physical gold RWAs, Sanad turns locked local pawn assets into global, liquid, and Shariah-compliant microfinance.
>
> Thank you!"

---

## 🔗 Key Demo Links for Judges

- **CC3 Credit Oracle Address**: [`0xB7AfB0419AdA5820872701325e00015BFAD10023`](https://creditcoin-testnet.blockscout.com/address/0xB7AfB0419AdA5820872701325e00015BFAD10023)
- **CC3 Liquidity Pool Address**: [`0xA2Ddf564f4F92A60cAD11AE95c49c25393D5e74F`](https://creditcoin-testnet.blockscout.com/address/0xA2Ddf564f4F92A60cAD11AE95c49c25393D5e74F)
- **CC3 SAG Gold NFT Address**: [`0xF87125c68Ad8Af788f4c7C91151976c15C3aCf13`](https://creditcoin-testnet.blockscout.com/address/0xF87125c68Ad8Af788f4c7C91151976c15C3aCf13)
- **Sepolia Repayment Gateway**: [`0xB2bF16f54Fa082Dee7acEf3De2AD26079F4af162`](https://sepolia.etherscan.io/address/0xB2bF16f54Fa082Dee7acEf3De2AD26079F4af162)
- **Sepolia Investor Vault**: [`0xE037A229aF3886D0181B7727e8252F72B1d3d45B`](https://sepolia.etherscan.io/address/0xE037A229aF3886D0181B7727e8252F72B1d3d45B)
- **Live Cross-Chain Investor Deposit Settlement Tx (CC3)**: [`0x36902dda63f508c27b644ee07c446694d3282bca019a15a816a35289ebd6e1d7`](https://creditcoin-testnet.blockscout.com/tx/0x36902dda63f508c27b644ee07c446694d3282bca019a15a816a35289ebd6e1d7) *(Sepolia Source: [`0x71b95becef...`](https://sepolia.etherscan.io/tx/0x71b95becef2c2311a046ab97571ec88acd7f2c078b411b5c87ff003c73d903d8))*
- **Live Cross-Chain Loan Repayment Settlement Tx (CC3)**: [`0xaec11c9b303618f52f443c2213f3a932a1f9dbb95fc2c991713c16ca0659536c`](https://creditcoin-testnet.blockscout.com/tx/0xaec11c9b303618f52f443c2213f3a932a1f9dbb95fc2c991713c16ca0659536c) *(Sepolia Source: [`0xf3035df4...`](https://sepolia.etherscan.io/tx/0xf3035df49e280f6583710bcc402c25c40eabf6d87115c5d35440f62162b51265))*
- **Live Native Investor Pool Deposit Tx (CC3)**: [`0xe4aa4d7b8c64685c4a41946ebf3354712a2f0886ecbd41ea155dbe666fca5ac9`](https://creditcoin-testnet.blockscout.com/tx/0xe4aa4d7b8c64685c4a41946ebf3354712a2f0886ecbd41ea155dbe666fca5ac9)
