# Attestcoin integration architecture

Sanad connects supported Ethereum transaction evidence to credit profiles and gold-backed financing records on Creditcoin CC3. Attestcoin verification is the core integration; physical gold appraisal remains the pawnshop's responsibility.

## Components and source map

| Component | Responsibility |
| --- | --- |
| [Backend credit bureau](../../backend/src/core/credit-bureau/) | Discover candidates, construct proofs, submit transactions, and track results |
| [Frontend credit bureau](../../frontend/core/credit-bureau/) | Display discovery, proof progress, and accepted credit profiles |
| [SanadCreditOracle](../../backend/src/contracts/SanadCreditOracle.sol) | Call BlockProver, validate claims, record events, and recalculate credit |
| [SanadLiquidityPool](../../backend/src/contracts/SanadLiquidityPool.sol) | Verify supported payment evidence and maintain pool/loan accounting |
| [SAGToken](../../backend/src/contracts/SAGToken.sol) | Record collateral NFTs and enforce contract roles |
| [Sepolia gateways](../../backend/src/contracts/sepolia/) | InvestorVault funding/disbursement and RepaymentGateway repayment/settlement |
| [Database schema](../../backend/src/db/db.schema.ts) | Application accounts, pledge requests, investments, repayments, and proof references |

## Proof execution boundary

1. Discovery identifies candidate source-chain transactions; it does not establish accepted credit history.
2. The proof service uses the Attestcoin SDK and remote or raw proof construction. ChainInfo at `0xFD3` supports attestation queries.
3. Encoded transactions, Merkle proofs, and continuity evidence are submitted to CC3.
4. Sanad calls BlockProver at `0xFD2` and requires verification.
5. Application-specific validation interprets the transaction before recording a credit or financing event.
6. The frontend and database track results using transaction hashes; a queued job is not a confirmed proof.

The oracle supports up to ten events per batch with shared continuity evidence. Owner-authorized KYC submission skips an extra borrower signature, not verification.

See [credit-bureau details](backend-credit-bureau.md) and the [README proof transaction](../../README.md#proof-of-integration) for inspectable evidence.

## Financing and Credit separation

Each pledge request identifies a distinct loan workflow. SAG means **Sanad Asset-backed Gold**; the NFT records collateral information, not independently verified physical possession.

Sepolia funding flows from investor to pawnshop, then from pawnshop to borrower. Repayment and investor settlement are separate actions. Attestcoin lets CC3 record supported payment evidence; it does not automatically move ETH to CC3 or settle an investor.

Native CTC liquidity and cross-chain funding evidence must remain separate ledgers. Some demo paths attach relayer-funded CTC; these are not a trustless bridge.

## Permissions and limitations

Application authentication and roles are distinct from oracle ownership and SAG minting/compliance roles. Off-chain registration does not grant on-chain control.

Source inclusion and financial interpretation are different checks. Pool payment paths check successful receipts; credit-oracle receipt checks and protocol-specific semantics need further hardening. Selected evidence does not establish complete borrower liabilities.

There is no implemented AI/Python gold-evaluation feature in the product scope documented here. Legacy files are not evidence of a shipped capability.

## Networks and roadmap

CC3 Testnet hosts the oracle, pool, and SAG contracts. Sepolia hosts InvestorVault and RepaymentGateway. Ethereum mainnet supplies historical DeFi activity. Within the current CC3 testnet setup, Attestcoin chain keys are 1 for Sepolia and 3 for mainnet; these differ from EVM chain IDs.

Use the [contract registry](../../backend/src/config/deployed-addresses.ts), [deployment runbook](../deployment/production.md), and [white paper](../white-paper.md) for configuration and limitations. Future writability requires supported deployments, redesigned escrow, authenticated messages, retries, and execution confirmation.
