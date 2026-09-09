# Demo walkthrough

Use testnet assets and dedicated test accounts. This is a reproducibility guide, not a promise that every deployed service is currently healthy.

## Before presenting

1. Check the frontend, API health, and database using the [deployment runbook](../deployment/production.md).
2. Confirm configured addresses against the [contract registry](../../backend/src/config/deployed-addresses.ts).
3. Ensure each test wallet has the appropriate network gas and permissions.
4. Prepare transaction hashes and identify any curated discovery fixtures explicitly.

## Five-minute sequence

| Segment | Demonstration |
| --- | --- |
| Problem | Explain why gold custody and repayment history are difficult to connect across institutions. |
| Borrower | Register/connect a wallet, discover DeFi history, and distinguish candidate events from accepted proofs. |
| Credit proof | Submit a supported batch and show the resulting CC3 transaction and credit profile. |
| Pawnshop | Show a specific pledge request, its appraisal record, SAG note, and loan-specific detail page. |
| Funding and repayment | Explain the Sepolia investor-to-pawnshop-to-borrower flow and the separate repayment/settlement steps. |
| Boundaries and roadmap | Explain Credit separation, physical custody, and the future escrow/writability integration. |

Two loans belonging to one borrower must have distinct pledge-request URLs. Showing one borrower's first loan is not sufficient verification.

For a live financial action, use only an explicitly approved test account and transaction. Do not demonstrate freeze, wipe, liquidation, or admin changes against another user's records.

## Technical evidence to show

- Source transaction hash and network.
- CC3 proof-submission transaction and accepted credit profile.
- Correct pledge request ID and SAG token association.
- Separate funding, repayment, and investor-settlement statuses.
- Explorer evidence rather than only a success toast.

## Claims to avoid

A proof does not move funds between chains, attest physical gold, or establish complete borrower history. Current payment gateways rely on pawnshop participation; they are not autonomous escrow. Test ETH is not mainnet investor liquidity. Shariah certification, measured economic improvements, and production security must not be implied without supporting reviews.

Use the [white paper](../white-paper.md) for equations, limitations, and planned upgrades.
