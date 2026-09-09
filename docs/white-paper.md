# Sanad Protocol
## Verifiable Credit. Accountable Gold Finance.
Technical White Paper | BUIDL CTC 2026 Fall | DeFi Track
Version 1.0 | 9 September 2026 | Source baseline: 569714d

### 1. Abstract
Sanad Protocol is a testnet implementation of a gold-backed microfinance network that connects borrower reputation, physical collateral records, and cross-chain payment evidence. Its objective is to improve the portability of financial history while connecting local pawnshop operators with digitally coordinated funding. Creditcoin provides the execution and recordkeeping environment; Attestcoin supplies cryptographic verification of selected Ethereum transactions. Ethereum Sepolia hosts demonstration payment gateways, while Creditcoin records collateral notes, credit profiles, and settlement evidence.

The architecture deliberately separates verification from custody. A valid transaction proof establishes inclusion in an attested source-chain history, but does not transfer liquidity, authenticate physical gold, or eliminate application-level interpretation risks. Sanad therefore distinguishes its proof-based credit bureau from its pawnshop-mediated payment flow and relayer-funded demonstration paths. The current implementation includes an ERC-721 collateral note, protocol-specific transaction screening, a deterministic credit score, and Dutch-auction recovery logic with borrower-surplus accounting.

This paper describes the implemented mechanisms, their assumptions, and the upgrades required for production deployment. Particular attention is given to monetary-unit consistency, complete receipt validation, administrative authority, and Shariah governance. Future Attestcoin writability could support authenticated settlement instructions, but requires redesigned escrow contracts and asynchronous execution controls. Sanad's contribution is an auditable integration architecture, not a claim that off-chain custody becomes trustless.

> STATUS NOTE: Research prototype using test assets. Shariah alignment is a design objective, not independent certification. This document is a technical description, not an investment offer, legal opinion, or security audit.

---
### 2. Introduction
Gold-backed microfinance combines a tangible security interest with a recurring need for short-term liquidity. A borrower may own jewelry yet lack a portable credit record; a pawnshop may possess specialist appraisal and custody capabilities yet operate with a constrained funding base. Sanad addresses this intersection by linking a collateral workflow to evidence of financial activity and externally supplied capital.

The opportunity sits within a substantial Islamic financial-services sector. The IFSB's 2025 stability report estimates total industry assets at USD 3.88 trillion in 2024. This is a dated, sector-wide benchmark, not Sanad's addressable market or a forecast of protocol revenue. The project's earlier USD 3.7 trillion reference should be understood in that historical context. [1]

Sanad's planning material also refers to more than 50,000 pawnshops and faster capital turnover. These are project-level market assumptions rather than independently established findings in this paper. Geographic market sizing, operator licensing, custody capacity, and actual loan-cycle measurements must precede commercial projections. No fivefold improvement or default-rate target is presented as demonstrated performance.

Three operational problems motivate the design. First, funding can remain tied to a pawnshop's own cash cycle rather than a transparent financing marketplace. Second, repayment behavior is fragmented across institutions and wallets. Third, asset-based DeFi commonly emphasizes readily liquidatable collateral rather than a borrower's portable history. Sanad does not solve these problems merely by lowering collateral requirements; it attempts to make the evidence supporting a financing decision easier to inspect.

The proposed solution couples a physical appraisal and custody process with a Sanad Asset-backed Gold token, or SAG note. A borrower can supply selected DeFi transaction evidence; a pawnshop records verified collateral characteristics and loan terms; an investor funds through a source-chain gateway. Creditcoin records the resulting evidence and status transitions. The on-chain note is not the physical asset itself, and rights of possession and enforcement remain dependent on the custody arrangement.

For the hackathon, the relevant engineering contribution is the integration of proof verification with a concrete financing workflow. The submission should be judged through reproducible transactions, explicit assumptions, and failure-path tests rather than broad claims of universal financial inclusion. The supplied event page was access-restricted during preparation, so this paper does not attribute unverified judging weights to its organizers. [2]

### 3. Protocol Architecture
Sanad consists of source-chain gateways, Creditcoin contracts, an off-chain coordination layer, and role-specific web interfaces. The application uses Next.js and React for the frontend, with Express and TypeScript services, PostgreSQL records, Redis-backed job infrastructure, and ethers-based contract interaction. Database identifiers bind borrower requests, SAG token identifiers, investments, repayment records, and source/destination transaction hashes. [3]

The current schema models a pledge request as a distinct loan workflow. This distinction matters when one borrower has several loans: a borrower address identifies a participant, while a pledge-request ID identifies the obligation being viewed or settled. The database is an operational index; blockchain evidence must remain independently inspectable when the index is unavailable or being rebuilt.

@diagram

Figure 1. The source-to-Creditcoin proof path is separate from the payment path. Physical verification enters through authorized operators, not through Attestcoin consensus.

Ethereum mainnet provides historical DeFi activity. Ethereum Sepolia, chain ID 11155111, hosts demonstration transfers of native test ETH. Creditcoin CC3 testnet, chain ID 102031, executes the credit oracle, SAG note, and pool logic. Within that Creditcoin testnet environment, Attestcoin chain key 1 identifies Sepolia and key 3 identifies Ethereum mainnet. Chain keys are environment-specific routing identifiers, not interchangeable with EVM chain IDs. [4]

Two trust models must be distinguished. The credit bureau seeks proof-based verification without a separate centralized oracle deciding whether a transaction exists. Its security nevertheless depends on Attestcoin's attestation assumptions, correct application decoding, and governed protocol registries. Discovery services select candidate evidence; they are not consensus authorities and do not establish that a supplied history is complete.

Payment settlement has a different boundary. The current peer-to-peer gateways forward funds to the pawnshop, which subsequently disburses or settles. Some backend proof paths additionally attach relayer-funded test CTC using a demonstration conversion. That rebalancing is not a cryptographic bridge and must not be confused with independent redemption rights.

Sanad applies "Credit separation" as its accounting boundary: value stays on the chain where it was transferred, while Creditcoin records the verified fact. In particular, cross-chain proven capital must not automatically become withdrawable native CTC. Native LP balances, historical funding evidence, and outstanding obligations are economically different quantities and need separate ledgers. [5]

---
### 4. Smart Contracts
#### 4.1 SanadCreditOracle
The oracle accepts a single proof or a batch of up to ten transactions. It calls the BlockProver precompile, decodes common EVM transaction fields, checks a registered target, tests borrower involvement, applies selector rules, and updates a deterministic profile. Batch submissions use parallel arrays and one shared continuity proof. Empty batches are rejected by the service before submission. [6]

Authorization permits the borrower or contract owner to submit without a borrower signature. Other callers require a 65-byte EIP-191 signature bound to the borrower, oracle address, Creditcoin chain ID, and nonce. The owner-authorized KYC path avoids repeated wallet prompts; it does not remove the proof-verification call. Owner-key custody and registry changes remain privileged operational responsibilities.

#### 4.2 SanadLiquidityPool
The pool implements native CTC deposits, withdrawals, loan balances, cross-chain evidence records, and liquidation mechanics. Native withdrawals check both accounting balances and available contract cash. Cross-chain funding records the source transaction's sender and value, while verifying the gateway, token ID, pawnshop, appraisal value, and successful receipt. Return-distribution evidence is tracked separately from credit-scoring events. [5]

The design is described as Mudarabah-oriented capital coordination, but the contract's LP mappings are not a complete audited profit-sharing fund. Asset valuation, loss allocation, investor entitlements, and currency treatment need reconciliation before production. In particular, cross-chain ETH balances and USD-labelled values must not enter native CTC payment calculations without an explicit conversion and denomination boundary.

#### 4.3 SAGToken
SAGToken is an ERC-721 collateral record with pawnshop and borrower addresses, weight, karat, appraisal, principal, tenure, custody fee, status, and metadata URI. Weight is documented in hundredths of a gram and appraisal in six-decimal USD units. Minting initially assigns the note to the pawnshop. [7]

MINTER_ROLE, SETTLEMENT_ROLE, and COMPLIANCE_ROLE separate operational powers. Compliance functions freeze individual tokens or addresses; an administrative wipe burns a note and records a reason. These capabilities provide intervention mechanisms, not proof of regulatory compliance. Their use requires governance, access control, and a process for reconciling outstanding financial claims when a note is frozen or destroyed.

#### 4.4 InvestorVault and RepaymentGateway
InvestorVault records one funding investor per token in the inspected implementation and forwards funding to the assigned pawnshop. Only that pawnshop can call disburseLoan, with matching transaction value; repeated disbursement is blocked. RepaymentGateway routes borrower payments to the recorded pawnshop, or its treasury fallback, and permits the pawnshop to forward settlement to the recorded investor. [8]

These gateways are routing contracts, not autonomous escrow. A database or interface that displays multiple investors does not override the source contract's single-funder mapping. Fractional funding requires a compatible on-chain entitlement model rather than only additional database rows.

@selectors

Table 1. Source-gateway selectors used by the inspected contracts. Proof acceptance must bind the selector to the correct target, chain, parameters, and successful outcome; the selector alone is insufficient.

---
### 5. Attestcoin Integration
Attestcoin readability combines source-chain attestation with transaction proving. Attestors reach consensus on source history; builders obtain encoded transaction data and off-chain proofs; Creditcoin contracts invoke the native verifier. The Merkle proof establishes membership, while the continuity proof connects the relevant block to an accepted attestation boundary. Verification and subsequent Creditcoin state changes occur within the consuming transaction. [9]

Sanad's IBlockProver interface uses Merkle entries containing a hash and left/right orientation, and a continuity structure containing a lower-endpoint digest and roots. The native address is 0x0000000000000000000000000000000000000FD2. IChainInfo at 0x0000000000000000000000000000000000000fD3 exposes attestation-height and bounds queries. These are protocol interfaces, not application-controlled price feeds. [6]

The backend supports both a remote ProofBuilder service and local RawProofBuilder construction for historical DeFi batches. The raw path retrieves source blocks and receipts, consults Creditcoin chain information, and constructs shared proof data. A fallback requests receipts individually when an RPC does not support bulk receipt retrieval. Batch results are matched back to requested hashes before submission, preventing an ordering assumption from pairing the wrong event payload with a proof.

Latency has several components: source confirmation and attestation, RPC retrieval, proof construction, Creditcoin inclusion, and database indexing. A ten-event limit is a batching constraint, not a promise that every batch completes within thirty seconds. Recent source transactions may need substantial attestation time; older transactions may require expensive historical retrieval. The interface should report those stages independently.

An inclusion proof is not a universal business assertion. Sanad's pool verification paths explicitly check successful receipts. The inspected credit oracle, however, decodes transaction calldata without an equivalent explicit receipt-success check in its claim-validation function. It also receives the event hash and timestamp as payload fields rather than visibly deriving both there from authenticated transaction data. These differences limit any blanket claim of end-to-end trustlessness. Production hardening must bind canonical identity, receipt outcome, protocol semantics, and event fields on-chain. [5,6]

Writability is a future integration in this paper. On the review date, official documentation says it is undergoing third-party testing and audits, with supported testnet release to follow. Its described path is Outbox publication, attestor signing, relayer delivery, and Inbox validation. It does not supply capital or create atomic execution across chains. Sanad should integrate authenticated instructions only after supported deployments and failure semantics are established. [10]

### 6. Credit Bureau System
Discovery queries Ethereum activity and classifies candidate repayments, borrowing, collateral supply, liquidations, and defaults. The code includes curated demonstration profiles, live indexer queries, token metadata, and reference-price fallbacks. It deduplicates by transaction hash, ranks by absolute signal weight and volume, and selects up to ten events. Discovery labels and estimated tiers must be distinguished from accepted on-chain profiles. [11]

Ten protocol categories are represented: Aave v3, Compound v3, Morpho Blue, Spark, MakerDAO, Euler v2, Fluid, Maple Finance, Goldfinch, and Fraxlend. Their adapters are not interchangeable. Compound supply can involve repayment or collateral; Maker operations can alter debt in either direction; Euler batches can contain multiple internal actions. Registry coverage and selector recognition do not demonstrate comprehensive semantic support for every deployed market or proxy.

For recognized stablecoins in the assumed asset-and-amount calldata layout, the oracle compares the claimed six-decimal USD volume with a normalized token amount. The permitted band is 80%-120% of that amount; an eighteen-decimal stablecoin amount is divided by 10^12. Unknown assets receive a broad mathematical upper bound, and maximum-uint repayment inputs bypass that particular check. These are defensive heuristics, not a verified dollar-price oracle. Protocol-specific receipt decoding is needed for robust amount attribution. [6]

The implemented score range is 0-1,000, not the 300-850 range in earlier project descriptions. Let R, B, C, L, and D denote accepted repayment, borrowing, collateral, liquidation, and default counts, and V denote total accepted repayment volume in six-decimal USD units. The current calculation is:

> S = clamp(500 + 50R + min(200, 20 floor(V / 100,000,000)) + min(40, 20B) + min(30, 15C) - 40L - 150D, 0, 1000)

The rule is transparent but not an empirically calibrated probability of default. Tier precedence is also important: a score below 350, any default, or at least two liquidations produces HighRisk. Otherwise Gold requires at least 750 and two repayments; Silver requires at least 550 and one repayment; Bronze follows from borrowing activity or a score of at least 500. An untouched profile is Unscored at 500. [6]

Production scoring should address selective disclosure, repeated low-value interactions, wallet rotation, stale activity, and the distinction between historical borrowing and current debt. A backend top-ten sample cannot prove the absence of adverse history. Non-custodial profiling means the scoring operation need not hold borrower assets; it does not mean the entire financing system has no custodian or governance authority.

---
### 7. Shariah Compliance Framework
Sanad is designed around secured financing, transparent custody charges, and equitable treatment of collateral proceeds. Rahn provides the conceptual security arrangement; a SAG note records the identified collateral and obligation. Ujrah represents a charge for a specified service, rather than an automatic entitlement to interest for the passage of time. The precise contractual structure requires qualified review, including how the investor-pawnshop relationship is characterized.

AAOIFI identifies Shariah Standard 39 as Mortgage and Its Contemporary Applications. It is a relevant reference for examining the collateral arrangement, not evidence that Sanad has been certified. A full review must also consider the financing and service agreements, local rules, custody practice, and the rights represented by the NFT. No independent Shariah-board opinion or regulatory authorization was established in this review. [12]

The pool's implemented custody-fee calculation uses a fixed monthly parameter M and elapsed custody time:

> U(t) = floor(M x max(0, t_end - t_origin) / (30 x 24 x 60 x 60))

Here t_end is the current time before liquidation, or the recorded liquidation-inception timestamp afterward. Auction resets preserve that inception time so additional rounds do not extend the programmed accrual window. This is Sanad's implementation policy; the thirty-day convention should not be represented as a universal religious requirement. [5]

The liquidation design allocates positive residual proceeds to the borrower. With price P, principal Q, and permitted custody charges U expressed in a common denomination, the intended surplus is max(0, P - Q - U). Returning 100% of this residual does not mean returning the entire sale price or guaranteeing principal recovery. An unsuccessful sale can leave a shortfall, and that loss requires an explicit contractual allocation.

There is an unresolved product-design issue: the backend calculates displayed investor profit using invested amount multiplied by an ROI percentage and duration. A fixed-return display is not sufficient evidence of a valid Mudarabah arrangement, and relabeling interest as profit would not resolve the issue. Before launch, Sanad must align implemented cash flows with approved risk-sharing and service-fee terms, remove misleading yield guarantees, and commission a documented review. [13]

The compliance objective should therefore be stated as design alignment with review gates. Smart-contract controls make rules inspectable and repeatable, but neither a freeze role nor an auction equation substitutes for appropriate agreements, physical controls, or independent oversight.

### 8. Loan Lifecycle
The lifecycle begins with wallet authentication and borrower registration. Credit discovery can accompany KYC, while the pawnshop supplies organizational information and undergoes approval. The borrower submits a pledge request describing the gold and requested financing. Physical inspection must confirm characteristics that photographs and software cannot conclusively establish.

After acceptance, the pawnshop records verification data, duration, appraisal, and related documentation. An authorized signer mints the SAG record. Off-chain request status and on-chain collateral status are distinct records and should be reconciled through transaction identifiers rather than assumed equivalent after a submitted request. [7,13]

In the source-chain funding flow, the investor calls fundLoan on InvestorVault. Test ETH reaches the pawnshop immediately. Attestcoin evidence subsequently permits Creditcoin to record the investor, amount, and linked collateral. The pawnshop then calls disburseLoan to transfer the agreed amount to the borrower. The backend has a proof-submission path for this payment, but the inspected pool does not expose a dedicated disbursement state machine equivalent to its funding and return-verification functions. [5,8,11]

The borrower repays through RepaymentGateway, which forwards the funds to the pawnshop. Creditcoin repayment verification checks the configured gateway, token reference, amount and successful receipt, then reduces the recorded balance or marks settlement. The pawnshop separately calls settleInvestor; another proof records return distribution. Borrower repayment and investor settlement must remain separate statuses because the former does not guarantee the latter has occurred.

Default eligibility follows a nonzero balance and the collateral's maturity timestamp. Liquidation requires maturity plus a configurable grace period, initially fourteen days. Someone must submit the transaction to trigger the auction; time alone does not execute a contract. The initial auction lasts twenty-four hours and descends linearly:

> P(t) = P_start - (P_start - P_reserve) x min((t - t_start) / T, 1)

This formula assumes compatible units and P_start greater than or equal to P_reserve. The owner can reset an expired auction at a lower reserve, subject to a floor of 50% of appraisal. A buyer must provide payment, and the pool requires transfer authority over the NFT. Delivery of physical gold remains a custody obligation. Native-pool liquidation must not be used as if it automatically settled an ETH-denominated investor claim. [5]

---
### 9. Technical Innovation and Security Boundaries
Sanad's distinctive contribution is the combination of a cross-chain evidence pipeline, transparent credit rules, and a gold-collateral workflow. Conventional application databases can record repayments; Sanad seeks to connect those records to independently verifiable source transactions. Conventional collateral NFTs can reference assets; Sanad adds financing lifecycle data and compliance intervention. The combination is useful only when its trust boundaries remain explicit.

"Zero-oracle credit scoring" should be interpreted narrowly as avoiding a separate centralized existence oracle for the selected source transactions. Attestcoin itself uses decentralized attestation infrastructure. Prices, off-chain appraisal, identity checks, discovery completeness, and contract interpretation remain additional assumptions. It would be inaccurate to describe every resulting business claim as trustless. [9]

The immediate security agenda includes canonical source-transaction binding, explicit receipt-success validation in the credit oracle, chain-scoped registries, complete action decoding, and denomination-safe accounting. Calldata address scanning establishes that an address occurs in an input word, not necessarily that it is the debtor. Accepted event categories must be tied to the economic meaning of the action, particularly for batching and multifunction protocol entry points. [6]

Governance is equally material. Contract owners configure gateway and protocol addresses; compliance operators can freeze or wipe notes; backend signers coordinate privileged operations. Production controls should use role separation, monitored multisignatures, delayed sensitive changes, and a public change log. Application admin access must not be conflated with on-chain ownership.

The repository includes gateway unit, fuzz and invariant tests and scripts for deposit, repayment, return distribution, compliance, and liquidation scenarios. These are useful reproducibility assets, not proof that every production path has passed an independent audit. A release evidence pack should identify the commit, compiler, deployment addresses, test results, and successful source-to-destination traces. [14]

### 10. Roadmap
The current milestone is a testnet demonstration with live web interfaces, transaction-proof integration, SAG records, and gateway workflows. The next stage should prioritize correctness over additional market claims: unify the schema and address registry, remove stale documentation, distinguish fixtures from live data, bind proof fields rigorously, and reconcile ETH, CTC and USD accounting.

The second stage is an escrow-based settlement redesign. New investor funding should remain subject to explicit release conditions, while repayments should enter a contract with investor and custody-fee entitlements. This removes the need for the pawnshop to send a second payment after receiving borrower funds. Existing loans cannot be migrated by silently assuming control over funds already forwarded to external wallets.

The third stage begins only when Attestcoin offers a supported writability route. A Sanad receiver should authenticate the Inbox, originating network and contract, loan identifier, action, amount, sequence and deadline. Duplicate delivery must not duplicate payment. Failed callbacks, inadequate funds, relayer downtime and delayed acknowledgements require visible recovery states rather than a premature "settled" badge. [10]

The first writability demonstration should be deliberately narrow: prove a repayment, authorize a distribution from available escrow, execute it on Sepolia, and confirm the resulting evidence on Creditcoin. Automated disbursement follows once physical-verification prerequisites and borrower terms are fixed. Neither workflow eliminates physical custody or source-chain transaction fees.

Next, a credit-registry adapter could publish issuer-authenticated tiers, model versions, expiry times and revocation status to an external chain. Lending protocols would need explicit integration and suitable underwriting; a published score cannot compel an existing market to offer unsecured credit. Multi-chain collateral recognition additionally requires exclusive allocation of backing and prevention of duplicate pledges.

Mainnet deployment is a gated milestone, not a date commitment. Required gates include independent security assessment, monetary-unit invariants, custody and redemption agreements, Shariah review, regulatory assessment, privacy controls, operational monitoring and incident recovery. Pilot institutions should be selected for verifiable custody processes and reconciliation capability, not merely access to gold inventories.

Institutional expansion should begin with constrained loan sizes and measurable service outcomes: proof completion rate, reconciliation delay, custody exceptions, realized recoveries and user complaints. Only after observing these outcomes should Sanad expand markets or treat historical tiers as calibrated underwriting inputs. No launch schedule, partnership, asset custody certification or guaranteed return is implied by this roadmap.

### 11. Conclusion
Sanad demonstrates how Creditcoin and Attestcoin can connect external transaction evidence to a practical gold-backed financing workflow. Its value lies in inspectable records and programmable coordination rather than the claim that tokenization removes every intermediary. The current gateways preserve pawnshop involvement; the credit bureau requires stronger semantic validation; and production financing requires disciplined accounting and independently reviewed terms.

The path forward is therefore incremental: strengthen proof interpretation, separate evidence from funds, establish accountable escrow, and then integrate supported cross-chain instructions. With those boundaries respected, Sanad can develop into infrastructure for portable financial history and more transparent collateral-backed microfinance, while preserving the distinction between a cryptographic fact and an enforceable economic obligation.

---
### Glossary
**Ar-Rahnu:** A gold-pledge financing practice framed around Islamic collateral principles.

**Attestation:** A consensus-backed commitment to source-chain history used by the verification system.

**BlockProver:** Creditcoin's native precompile for transaction inclusion and continuity verification.

**Chain key:** An Attestcoin environment-specific source-chain identifier; not an EVM chain ID.

**Continuity proof:** Evidence connecting a transaction's block to an accepted attestation boundary.

**Credit separation:** Sanad's source-code label for keeping cross-chain evidence separate from locally withdrawable capital.

**Dutch auction:** A sale mechanism in which the offered price declines toward a reserve.

**LTV:** Loan-to-value ratio, calculated using principal and collateral value in compatible units.

**Mudarabah:** A profit-sharing investment structure requiring properly specified rights, responsibilities and risk allocation.

**Rahn:** A collateral or pledge arrangement securing an obligation.

**Readability:** Verification and use on Creditcoin of authenticated source-chain transaction data.

**Relayer:** An off-chain process submitting proofs or messages; submission does not itself establish truth or move liquidity between networks.

**SAG:** Sanad Asset-backed Gold, the protocol's ERC-721 collateral note.

**Ujrah:** Compensation for an agreed service, here described as custody or safekeeping.

**Writability:** Authenticated messaging intended to trigger receiving-contract logic on another chain.

### Deployment Reference
The following addresses are taken from the application's current deployed-addresses registry, not the older README table. They identify the configured testnet contracts at the source baseline; this publication does not attest bytecode equivalence or fresh on-chain ownership checks. [15]

@addresses

---
### References and Review Basis
[1] Islamic Financial Services Board. Islamic Financial Services Industry Stability Report 2025. Sector assets for 2024; used as historical context, not a current market forecast. https://www.ifsb.org/publication-document/islamic-financial-services-industry-stability-report-2025/

[2] DoraHacks. BUIDL CTC 2026 Fall event page, supplied in the brief. Human-verification restriction prevented confirmation of detailed judging criteria. https://dorahacks.io/hackathon/buidl-ctc-2026-fall

[3] Sanad repository, README; architecture documents; frontend portals and libraries; backend pledge-request, investor, pawnshop and loan-return modules. Older Suyula/Hedera documents are treated as historical requirements, not evidence of current implementation. https://github.com/ola-893/Sanad/tree/569714d

[4] Attestcoin Protocol Chains - Environments. https://docs.attestcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments

[5] SanadLiquidityPool.sol, source baseline 569714d. https://github.com/ola-893/Sanad/blob/569714d/backend/src/contracts/SanadLiquidityPool.sol

[6] SanadCreditOracle.sol and interfaces/IBlockProver.sol, interfaces/IChainInfo.sol. https://github.com/ola-893/Sanad/blob/569714d/backend/src/contracts/SanadCreditOracle.sol

[7] SAGToken.sol. https://github.com/ola-893/Sanad/blob/569714d/backend/src/contracts/SAGToken.sol

[8] InvestorVault.sol and RepaymentGateway.sol. https://github.com/ola-893/Sanad/tree/569714d/backend/src/contracts/sepolia

[9] Attestcoin Readability. https://docs.attestcoin.org/attestcoin-protocol/attestcoin-readability

[10] Attestcoin Writability; official relayer implementation. https://docs.attestcoin.org/attestcoin-protocol/attestcoin-writability ; https://github.com/gluwa/asc-message-relayer

[11] Sanad core credit-bureau discovery, proof service and controller. https://github.com/ola-893/Sanad/tree/569714d/backend/src/core/credit-bureau

[12] AAOIFI. Shariah Standard 39: Mortgage and Its Contemporary Applications. Referenced as an alignment framework, not certification. https://aaoifi.com/ss-39-mortgage-and-its-contemporary-applications/?lang=en

[13] Sanad pledge-request controller and loan-return model. https://github.com/ola-893/Sanad/tree/569714d/backend/src/features/pledge-request

[14] Sanad gateway tests and E2E scripts. https://github.com/ola-893/Sanad/tree/569714d/backend/src/contracts/sepolia/test ; https://github.com/ola-893/Sanad/tree/569714d/backend/src/scripts

[15] Sanad configured contract registry. https://github.com/ola-893/Sanad/blob/569714d/backend/src/config/deployed-addresses.ts

Review date: 9 September 2026. Source inspection supports the implementation descriptions; it does not constitute an exhaustive security audit, legal due diligence, or a fresh test of every contract deployment. Forward-looking mechanisms are explicitly separated from the current testnet implementation.
