// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SAGToken.sol";

/**
 * @notice Native Creditcoin BlockProver Precompile Interface (0xFD2)
 */
interface IBlockProver {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

/**
 * @title SanadLiquidityPool
 * @notice Shariah-compliant gold financing liquidity pool on Creditcoin 3 (CC3).
 *         Accepts cross-chain repayment proofs verified directly via native BlockProver precompile,
 *         manages multi-LP capital accounting in native CTC, and executes Dutch auction liquidations with strict
 *         Shariah surplus refunds to borrowers.
 */
contract SanadLiquidityPool is Ownable, ReentrancyGuard {
    // Creditcoin 3 Native Precompile Address for BlockProver
    address public constant BLOCK_PROVER_PRECOMPILE = address(0x0000000000000000000000000000000000000FD2);

    SAGToken public immutable sagToken;

    // Liquidation & Grace Period Parameters
    uint256 public gracePeriod = 14 days;        // Grace period post-maturity before auction eligibility
    uint256 public auctionDuration = 24 hours;   // Dutch auction decay duration
    uint256 public constant MIN_DISTRESSED_RECOVERY_BPS = 5000; // Hard safety floor: 50% minimum of appraised fair market value

    // LP Capital Accounting (Native CTC)
    mapping(address => uint256) public lpBalances;
    uint256 public totalPoolLiquidity;

    // Prevent double-spending of cross-chain source transaction proofs
    mapping(bytes32 => bool) public processedSourceTransactions;

    // Track active loan balance per SAG collateral token
    mapping(uint256 => uint256) public tokenLoanBalance;

    // Track investor return distribution per SAG collateral token (Sepolia settleInvestor)
    mapping(uint256 => bool) public returnDistributed;
    mapping(uint256 => uint256) public returnAmountDistributed;

    // Dutch Auction State
    struct LiquidationAuction {
        uint256 tokenId;
        uint256 startPriceUSD;   // Initial auction price (appraised fair market value)
        uint256 reservePriceUSD; // Minimum floor price (principal debt obligation)
        uint256 startTime;       // Auction start timestamp
        uint256 endTime;         // Auction end timestamp
        bool active;             // Whether auction is open
    }
    mapping(uint256 => LiquidationAuction) public auctions;

    // Track immutable write-once liquidation inception timestamp per token (for Shariah Ujrah fee freeze)
    mapping(uint256 => uint256) public liquidationInceptionTimestamp;

    // Events
    event LiquidityDeposited(address indexed provider, uint256 amount, uint256 newTotalLiquidity);
    event LiquidityWithdrawn(address indexed provider, uint256 amount, uint256 newTotalLiquidity);
    event LoanFunded(uint256 indexed tokenId, address indexed pawnshop, uint256 amount);
    event CrossChainRepaymentVerified(
        uint256 indexed tokenId,
        uint64 indexed chainKey,
        bytes32 indexed sourceTxHash,
        uint256 amountUSD,
        uint256 timestamp
    );
    event CollateralUnlocked(uint256 indexed tokenId, address indexed pawnshop, uint256 timestamp);
    event LoanRepaid(
        uint256 indexed tokenId,
        address indexed payer,
        uint256 principalRepaid,
        uint256 ujrahFeePaid,
        uint256 timestamp
    );
    event ReturnDistributionVerified(
        uint256 indexed tokenId,
        address indexed pawnshop,
        uint256 amount,
        bytes32 indexed sourceTxHash,
        uint256 timestamp
    );

    // Default & Liquidation Audit Events
    event DefaultGracePeriodEntered(uint256 indexed tokenId, uint256 maturityTimestamp, uint256 gracePeriodEnd);
    event LiquidationAuctionStarted(
        uint256 indexed tokenId,
        uint256 startPriceUSD,
        uint256 reservePriceUSD,
        uint256 auctionEndTime
    );
    event CollateralLiquidated(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 salePriceUSD,
        uint256 principalRepaid,
        uint256 ujrahFeePaid,
        uint256 surplusToBorrower,
        uint256 shortfallToPool
    );
    event SurplusReturnedToBorrower(uint256 indexed tokenId, address indexed borrower, uint256 amountUSD);
    event ShortfallDistributedToPool(uint256 indexed tokenId, uint256 shortfallUSD, uint256 newTotalLiquidity);

    constructor(address _sagToken) Ownable(msg.sender) {
        require(_sagToken != address(0), "Invalid SAG token address");
        sagToken = SAGToken(_sagToken);
    }

    // =========================================================================
    // LP CAPITAL ACCOUNTING (DEPOSITS & WITHDRAWALS - NATIVE CTC)
    // =========================================================================

    /**
     * @notice Deposit native CTC liquidity into the pool
     */
    function depositLiquidity() external payable {
        require(msg.value > 0, "Amount must be greater than 0");

        lpBalances[msg.sender] += msg.value;
        totalPoolLiquidity += msg.value;

        emit LiquidityDeposited(msg.sender, msg.value, totalPoolLiquidity);
    }

    /**
     * @notice Direct native CTC receive fallback to deposit liquidity
     */
    receive() external payable {
        require(msg.value > 0, "Amount must be greater than 0");

        lpBalances[msg.sender] += msg.value;
        totalPoolLiquidity += msg.value;

        emit LiquidityDeposited(msg.sender, msg.value, totalPoolLiquidity);
    }

    /**
     * @notice Withdraw native CTC liquidity from the pool
     */
    function withdrawLiquidity(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(lpBalances[msg.sender] >= amount, "Insufficient LP balance");
        require(totalPoolLiquidity >= amount, "Insufficient pool liquidity");
        require(address(this).balance >= amount, "Insufficient native CTC cash in pool balance");

        lpBalances[msg.sender] -= amount;
        totalPoolLiquidity -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        emit LiquidityWithdrawn(msg.sender, amount, totalPoolLiquidity);
    }

    // =========================================================================
    // LOAN FUNDING & CROSS-CHAIN SETTLEMENT
    // =========================================================================

    /**
     * @notice Fund a pawnshop's tokenized gold collateral note with native CTC
     */
    function fundLoan(uint256 tokenId, uint256 amount) external onlyOwner nonReentrant {
        require(tokenLoanBalance[tokenId] == 0, "Loan already funded");
        
        // Explicit compliance checks to prevent funding frozen collateral or frozen pawnshops
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address pawnshop = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(pawnshop), "Compliance: Pawnshop address is frozen");
        require(totalPoolLiquidity >= amount, "Insufficient pool liquidity to fund loan");
        require(address(this).balance >= amount, "Insufficient native CTC cash in pool balance");

        tokenLoanBalance[tokenId] = amount;

        // Disburse native CTC liquidity to pawnshop
        (bool ok, ) = pawnshop.call{value: amount}("");
        require(ok, "Transfer failed");

        emit LoanFunded(tokenId, pawnshop, amount);
    }

    // Deployed Repayment Gateway Address on Sepolia (ChainKey: 1)
    address public repaymentGatewayAddress;
    // Deployed Investor Vault Address on Sepolia (ChainKey: 1)
    address public investorVaultAddress;

    // =========================================================================
    // PROVEN CROSS-CHAIN INVESTOR CAPITAL & REPUTATION LEDGER (Cr3dX Separation)
    // Value stays where it landed (Sepolia treasury). CC3 records cryptographic truth
    // without inflating unbacked withdrawable native lpBalances.
    // =========================================================================
    struct ProvenInvestorDeposit {
        uint64 chainKey;
        bytes32 sourceTxHash;
        uint256 amount;
        uint256 timestamp;
    }

    // Investor Address => Array of proven cross-chain deposit events
    mapping(address => ProvenInvestorDeposit[]) public investorProvenDeposits;

    // Investor Address => Cumulative proven cross-chain capital
    mapping(address => uint256) public investorTotalProvenCapital;

    // Global cumulative proven cross-chain capital recorded on CC3
    uint256 public totalCrossChainProvenCapital;

    // Mapping of loan tokenId => cross-chain funding investor address
    mapping(uint256 => address) public loanInvestors;

    event CrossChainLoanFunded(
        uint64 indexed chainKey,
        bytes32 indexed sourceTxHash,
        uint256 indexed tokenId,
        address investor,
        address pawnshop,
        uint256 amount,
        uint256 appraisedValueUSD,
        uint256 timestamp
    );

    event RepaymentGatewayUpdated(address indexed oldGateway, address indexed newGateway);
    event InvestorVaultUpdated(address indexed oldVault, address indexed newVault);
    event CrossChainDepositVerified(
        address indexed investor,
        uint64 indexed chainKey,
        bytes32 indexed sourceTxHash,
        uint256 amount,
        uint256 totalProvenCapital,
        uint256 timestamp
    );

    function setRepaymentGatewayAddress(address _repaymentGateway) external onlyOwner {
        require(_repaymentGateway != address(0), "Invalid gateway address");
        emit RepaymentGatewayUpdated(repaymentGatewayAddress, _repaymentGateway);
        repaymentGatewayAddress = _repaymentGateway;
    }

    function setInvestorVaultAddress(address _investorVault) external onlyOwner {
        require(_investorVault != address(0), "Invalid vault address");
        emit InvestorVaultUpdated(investorVaultAddress, _investorVault);
        investorVaultAddress = _investorVault;
    }

    /**
     * @notice Verifies an Attestcoin inclusion proof on-chain for a Sepolia investor deposit and credits LP share.
     * @dev Decodes chunks[0] for target contract binding (to == investorVaultAddress),
     *      function selector (0xb6b55f25 = deposit(uint256)), and extracts sender + amount.
     *      Decodes chunks[last] for receiptStatus == 1 (revert protection).
     *      Enforces replay protection against sourceTxHash.
     */
    function verifyAndRecordDeposit(
        uint64 chainKey,
        uint64 headerNumber,
        bytes calldata encodedTransaction,
        IBlockProver.MerkleProof calldata merkleProof,
        IBlockProver.ContinuityProof calldata continuityProof,
        bytes32 sourceTxHash,
        uint256 claimedAmount
    ) external payable returns (bool) {
        require(!processedSourceTransactions[sourceTxHash], "Deposit transaction already settled");

        // 1. Execute verification against Creditcoin's native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // 2. Decode outer ABI structure (uint8 txType, bytes[] chunks)
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length >= 2, "Malformed encodedTransaction chunks");
        require(txType <= 4, "Invalid transaction type");

        // 3. Decode Chunk 0 (Common EVM transaction fields)
        (
            /* uint64 nonce */,
            /* uint64 gasLimit */,
            address from,
            bool toIsNull,
            address to,
            /* uint256 value */,
            bytes memory data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));

        require(!toIsNull, "Target contract cannot be null");
        require(investorVaultAddress != address(0), "InvestorVault address not configured");
        require(to == investorVaultAddress, "Target contract does not match InvestorVault");
        require(data.length >= 36, "Invalid calldata length for deposit(uint256)");

        // 4. Validate Function Selector (deposit(uint256) = 0xb6b55f25)
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        require(selector == 0xb6b55f25, "Invalid function selector for deposit(uint256)");

        // 5. Decode Calldata Parameters (amount)
        uint256 calldataAmount;
        assembly {
            calldataAmount := mload(add(data, 36))
        }
        require(calldataAmount > 0, "Deposit amount must be greater than zero");
        if (claimedAmount > 0) {
            require(calldataAmount >= claimedAmount, "Decoded calldata amount is less than claimedAmount");
        }
        uint256 effectiveDepositAmount = claimedAmount > 0 ? claimedAmount : calldataAmount;

        // 6. Decode Receipt Chunk (chunks[chunks.length - 1]) and check receiptStatus == 1
        uint8 receiptStatus = abi.decode(chunks[chunks.length - 1], (uint8));
        require(receiptStatus == 1, "Source transaction was reverted on Ethereum Sepolia");

        // 7. Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        // 8. Record verified cross-chain deposit in investor credit/reputation history (Cr3dX Separation)
        // Value stays where it landed (Sepolia treasury). CC3 records cryptographic truth without unbacked LP balance inflation.
        investorProvenDeposits[from].push(
            ProvenInvestorDeposit({
                chainKey: chainKey,
                sourceTxHash: sourceTxHash,
                amount: effectiveDepositAmount,
                timestamp: block.timestamp
            })
        );
        investorTotalProvenCapital[from] += effectiveDepositAmount;
        totalCrossChainProvenCapital += effectiveDepositAmount;

        emit CrossChainDepositVerified(
            from,
            chainKey,
            sourceTxHash,
            effectiveDepositAmount,
            investorTotalProvenCapital[from],
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Verifies an Attestcoin inclusion proof on-chain for a peer-to-peer cross-chain loan funding event on Sepolia.
     * @dev Follows Cr3dX separation: real ETH moved directly from investor to borrower on Sepolia in InvestorVault.fundLoan().
     *      This CC3 function verifies the cryptographic proof and updates CC3 accounting/bookkeeping only.
     *      NO native CTC is transferred out of the pool (address(this).balance and totalPoolLiquidity remain untouched).
     *      The verified sender "from" extracted directly from the signed transaction envelope is the sole source of truth for investor identity.
     *      The native transaction envelope "value" is the sole source of truth for the funding volume.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param chainKey Chain Key (1 for Ethereum Sepolia)
     * @param headerNumber Block header number where deposit was mined
     * @param encodedTransaction Encoded transaction structure (txType, chunks)
     * @param merkleProof Attestcoin Merkle proof
     * @param continuityProof Attestcoin Continuity proof
     * @param sourceTxHash Hash of the funding transaction on Sepolia
     */
    function verifyAndFundLoanCrossChain(
        uint256 tokenId,
        uint64 chainKey,
        uint64 headerNumber,
        bytes calldata encodedTransaction,
        IBlockProver.MerkleProof calldata merkleProof,
        IBlockProver.ContinuityProof calldata continuityProof,
        bytes32 sourceTxHash
    ) external returns (bool) {
        require(!processedSourceTransactions[sourceTxHash], "Funding transaction already settled");

        // Explicit compliance checks to prevent funding frozen collateral or frozen pawnshops
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address pawnshop = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(pawnshop), "Compliance: Pawnshop address is frozen");

        // Ensure loan is awaiting funding (ActivePledged with zero loan balance)
        require(tokenLoanBalance[tokenId] == 0, "Loan already funded");

        // 1. Execute verification against Creditcoin native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // 2. Decode outer ABI structure (uint8 txType, bytes[] chunks)
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length >= 2, "Malformed encodedTransaction chunks");
        require(txType <= 4, "Invalid transaction type");

        // 3. Decode Chunk 0 (Common EVM transaction fields)
        (
            /* uint64 nonce */,
            /* uint64 gasLimit */,
            address from,
            bool toIsNull,
            address to,
            uint256 value,
            bytes memory data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));

        require(!toIsNull, "Target contract cannot be null");
        require(investorVaultAddress != address(0), "InvestorVault address not configured");
        require(to == investorVaultAddress, "Target contract does not match InvestorVault");
        require(data.length >= 100, "Invalid calldata length for fundLoan(uint256,address,uint256)");

        // 4. Validate Function Selector (fundLoan(uint256,address,uint256) = 0xfdc6f341)
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        require(selector == 0xfdc6f341, "Invalid function selector for fundLoan(uint256,address,uint256)");

        // 5. Decode Calldata Parameters (tokenId, pawnshop, appraisedValueUSD)
        uint256 calldataTokenId;
        address calldataPawnshop;
        uint256 calldataAppraisedUSD;
        assembly {
            calldataTokenId := mload(add(data, 36))
            calldataPawnshop := mload(add(data, 68))
            calldataAppraisedUSD := mload(add(data, 100))
        }
        require(calldataTokenId == tokenId, "Token ID in calldata does not match claimed tokenId");
        require(calldataPawnshop == pawnshop, "Pawnshop in calldata does not match token owner");

        // 6. Cross-check claimed appraisedValueUSD against trusted on-chain SAGToken collateral record
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        require(calldataAppraisedUSD == collateral.appraisedValueUSD, "Appraised value USD mismatch with SAG collateral note");
        require(value > 0, "Funding amount must be greater than zero");

        // 7. Decode Receipt Chunk (chunks[chunks.length - 1]) and check receiptStatus == 1
        uint8 receiptStatus = abi.decode(chunks[chunks.length - 1], (uint8));
        require(receiptStatus == 1, "Source transaction was reverted on Ethereum Sepolia");

        // 8. Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        // 9. Bookkeeping on CC3 (Cr3dX Separation: DO NOT disburse CTC!)
        tokenLoanBalance[tokenId] = value;
        loanInvestors[tokenId] = from;

        // Record investor proven capital and credit reputation
        investorProvenDeposits[from].push(
            ProvenInvestorDeposit({
                chainKey: chainKey,
                sourceTxHash: sourceTxHash,
                amount: value,
                timestamp: block.timestamp
            })
        );
        investorTotalProvenCapital[from] += value;
        totalCrossChainProvenCapital += value;

        emit CrossChainLoanFunded(
            chainKey,
            sourceTxHash,
            tokenId,
            from,
            pawnshop,
            value,
            calldataAppraisedUSD,
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Verifies an Attestcoin inclusion proof on-chain for an investor return distribution event on Sepolia.
     * @dev Settled via RepaymentGateway.settleInvestor(uint256,uint256) (selector: 0x58ffdcee).
     *      Decodes chunk0 for (from, to, value, data).
     *      Requires to == repaymentGatewayAddress (settleInvestor lives on RepaymentGateway, not InvestorVault).
     *      Requires from == sagToken.ownerOf(tokenId) (binds caller to the correct pawnshop).
     *      Requires calldataTokenId == tokenId and value == calldataAmount (defense in depth).
     *      Does NOT decode or verify the recipient address (guaranteed by settleInvestor to pay loanFunders(tokenId)).
     *      Does NOT feed into SanadCreditOracle or investorTotalProvenCapital (receiving a return is a loan-closure fact).
     *      Updates returnDistributed and returnAmountDistributed mappings.
     *      Emits ReturnDistributionVerified.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param chainKey Chain Key (1 for Ethereum Sepolia)
     * @param headerNumber Block header number where settlement was mined
     * @param encodedTransaction Encoded transaction structure (txType, chunks)
     * @param merkleProof Attestcoin Merkle proof
     * @param continuityProof Attestcoin Continuity proof
     * @param sourceTxHash Hash of the settleInvestor transaction on Sepolia
     */
    function verifyAndRecordReturnDistribution(
        uint256 tokenId,
        uint64 chainKey,
        uint64 headerNumber,
        bytes calldata encodedTransaction,
        IBlockProver.MerkleProof calldata merkleProof,
        IBlockProver.ContinuityProof calldata continuityProof,
        bytes32 sourceTxHash
    ) external returns (bool) {
        require(!processedSourceTransactions[sourceTxHash], "Return distribution transaction already settled");

        // Compliance checks to block settlement on frozen loans/accounts
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address pawnshop = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(pawnshop), "Compliance: Pawnshop address is frozen");

        // 1. Execute verification against Creditcoin native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // 2. Decode outer ABI structure (uint8 txType, bytes[] chunks)
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length >= 2, "Malformed encodedTransaction chunks");
        require(txType <= 4, "Invalid transaction type");

        // 3. Decode Chunk 0 (Common EVM transaction fields)
        (
            /* uint64 nonce */,
            /* uint64 gasLimit */,
            address from,
            bool toIsNull,
            address to,
            uint256 value,
            bytes memory data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));

        require(!toIsNull, "Target contract cannot be null");
        require(repaymentGatewayAddress != address(0), "RepaymentGateway address not configured");
        require(to == repaymentGatewayAddress, "Target contract does not match RepaymentGateway");
        require(data.length >= 68, "Invalid calldata length for settleInvestor(uint256,uint256)");

        // 4. Validate Function Selector (settleInvestor(uint256,uint256) = 0x58ffdcee)
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        require(selector == 0x58ffdcee, "Invalid function selector for settleInvestor(uint256,uint256)");

        // 5. Decode Calldata Parameters (tokenId, amount)
        uint256 calldataTokenId;
        uint256 calldataAmount;
        assembly {
            calldataTokenId := mload(add(data, 36))
            calldataAmount := mload(add(data, 68))
        }
        require(calldataTokenId == tokenId, "Token ID in calldata does not match claimed tokenId");
        require(value == calldataAmount, "Transaction value does not match settleInvestor amount");
        require(from == pawnshop, "Caller does not match assigned pawnshop for token");

        // 6. Decode Receipt Chunk (chunks[chunks.length - 1]) and check receiptStatus == 1
        uint8 receiptStatus = abi.decode(chunks[chunks.length - 1], (uint8));
        require(receiptStatus == 1, "Source transaction was reverted on Ethereum Sepolia");

        // 7. Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        // 8. Record return distribution state (isolated from credit oracle / proven capital)
        returnDistributed[tokenId] = true;
        returnAmountDistributed[tokenId] = calldataAmount;

        emit ReturnDistributionVerified(tokenId, pawnshop, calldataAmount, sourceTxHash, block.timestamp);

        return true;
    }


    /**
     * @notice Verifies an Attestcoin inclusion proof on-chain and marks the loan repaid.
     * @dev Decodes chunks[0] for target contract binding (to == repaymentGatewayAddress),
     *      function selector (0xd8aed145 = repay(uint256,uint256)), and extracts tokenId + repaidAmount.
     *      Decodes chunks[last] for receiptStatus == 1 (revert protection).
     *      Enforces replay protection against sourceTxHash.
     */
    function verifyAndSettleRepayment(
        uint256 tokenId,
        uint64 chainKey,
        uint64 headerNumber,
        bytes calldata encodedTransaction,
        IBlockProver.MerkleProof calldata merkleProof,
        IBlockProver.ContinuityProof calldata continuityProof,
        bytes32 sourceTxHash,
        uint256 repaidAmountUSD
    ) external payable returns (bool) {
        require(!processedSourceTransactions[sourceTxHash], "Repayment transaction already settled");

        // Explicit compliance checks to block settlement on frozen loans/accounts
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address owner = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(owner), "Compliance: Owner address is frozen");

        // 1. Execute verification against Creditcoin's native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // 2. Decode outer ABI structure (uint8 txType, bytes[] chunks)
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length >= 2, "Malformed encodedTransaction chunks");
        require(txType <= 4, "Invalid transaction type");

        // 3. Decode Chunk 0 (Common EVM transaction fields)
        (
            /* uint64 nonce */,
            /* uint64 gasLimit */,
            /* address from */,
            bool toIsNull,
            address to,
            /* uint256 value */,
            bytes memory data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));

        require(!toIsNull, "Target contract cannot be null");
        require(repaymentGatewayAddress != address(0), "RepaymentGateway address not configured");
        require(to == repaymentGatewayAddress, "Target contract does not match RepaymentGateway");
        require(data.length >= 68, "Invalid calldata length for repay(uint256,uint256)");

        // 4. Validate Function Selector (repay(uint256,uint256) = 0xd8aed145)
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        require(selector == 0xd8aed145, "Invalid function selector for repay(uint256,uint256)");

        // 5. Decode Calldata Parameters (tokenId, amount)
        uint256 calldataTokenId;
        uint256 calldataAmount;
        assembly {
            calldataTokenId := mload(add(data, 36))
            calldataAmount := mload(add(data, 68))
        }
        require(calldataTokenId == tokenId, "Token ID in calldata does not match claimed tokenId");
        require(calldataAmount > 0, "Repayment amount must be greater than zero");
        if (repaidAmountUSD > 0) {
            require(calldataAmount >= repaidAmountUSD, "Decoded calldata amount is less than claimed repaidAmountUSD");
        }
        uint256 effectiveRepaidAmount = repaidAmountUSD > 0 ? repaidAmountUSD : calldataAmount;

        // 6. Decode Receipt Chunk (chunks[chunks.length - 1]) and check receiptStatus == 1
        uint8 receiptStatus = abi.decode(chunks[chunks.length - 1], (uint8));
        require(receiptStatus == 1, "Source transaction was reverted on Ethereum Sepolia");

        // 7. Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        if (tokenLoanBalance[tokenId] <= effectiveRepaidAmount) {
            tokenLoanBalance[tokenId] = 0;
            sagToken.settleLoan(tokenId);

            emit CollateralUnlocked(tokenId, owner, block.timestamp);
        } else {
            tokenLoanBalance[tokenId] -= effectiveRepaidAmount;
        }

        emit CrossChainRepaymentVerified(tokenId, chainKey, sourceTxHash, effectiveRepaidAmount, block.timestamp);

        return true;
    }

    /**
     * @notice Directly repays an active loan in native CTC on Creditcoin CC3 (Same-Chain Settlement)
     * @dev Follows nonReentrant + checks-effects-interactions pattern.
     *      Calculates principal + accrued Ujrah safekeeping fee.
     *      Restores principal to totalPoolLiquidity, transfers accrued Ujrah to pawnshop custodian,
     *      unlocks SAG collateral note, and refunds any excess CTC payment.
     * @param tokenId SAG Token ID
     */
    function repayLoanDirect(uint256 tokenId) external payable nonReentrant {
        require(tokenLoanBalance[tokenId] > 0, "Loan is not active");
        
        // Compliance check: Disputed or frozen tokens/borrowers cannot settle
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        require(!sagToken.frozenAddress(collateral.borrower), "Compliance: Borrower address is frozen");

        uint256 principalOwed = tokenLoanBalance[tokenId];
        uint256 ujrahFee = calculateAccruedUjrah(tokenId);
        uint256 totalRequired = principalOwed + ujrahFee;

        require(msg.value >= totalRequired, "Insufficient CTC repayment amount sent");

        // Effects
        tokenLoanBalance[tokenId] = 0;
        totalPoolLiquidity += principalOwed;

        // Settle loan status on SAGToken
        sagToken.settleLoan(tokenId);

        // Interactions
        // 1. Pay pawnshop custodian accrued safekeeping/ujrah fee in native CTC
        if (ujrahFee > 0) {
            (bool okPawnshop, ) = collateral.pawnshop.call{value: ujrahFee}("");
            require(okPawnshop, "Ujrah payment to pawnshop failed");
        }

        // 2. Refund excess payment to sender if any
        if (msg.value > totalRequired) {
            uint256 excess = msg.value - totalRequired;
            (bool okRefund, ) = msg.sender.call{value: excess}("");
            require(okRefund, "Excess refund to sender failed");
        }

        emit CollateralUnlocked(tokenId, collateral.borrower, block.timestamp);
        emit LoanRepaid(tokenId, msg.sender, principalOwed, ujrahFee, block.timestamp);
    }

    // =========================================================================
    // DEFAULT & DUTCH AUCTION LIQUIDATION
    // =========================================================================

    /**
     * @notice Checks whether a loan is defaulted or eligible for liquidation
     */
    function checkDefaultStatus(uint256 tokenId) external view returns (bool isDefaulted, bool isLiquidationEligible) {
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        if (tokenLoanBalance[tokenId] == 0) return (false, false);

        isDefaulted = block.timestamp > collateral.maturityTimestamp;
        isLiquidationEligible = block.timestamp > (collateral.maturityTimestamp + gracePeriod);
    }

    /**
     * @notice Triggers Dutch auction liquidation after the grace period expires without repayment
     */
    function triggerLiquidation(uint256 tokenId) external {
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        require(tokenLoanBalance[tokenId] > 0, "Loan is not active");
        require(!auctions[tokenId].active, "Auction already active");

        // Compliance check: Disputed or frozen tokens CANNOT be auctioned
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        require(!sagToken.frozenAddress(collateral.borrower), "Compliance: Borrower address is frozen");

        // Shariah Grace Period Check: Must pass maturity + gracePeriod
        uint256 gracePeriodEnd = collateral.maturityTimestamp + gracePeriod;
        require(block.timestamp > gracePeriodEnd, "Grace period has not expired");

        uint256 startPrice = collateral.appraisedValueUSD;
        uint256 reservePrice = tokenLoanBalance[tokenId]; // Minimum recovery is principal owed

        liquidationInceptionTimestamp[tokenId] = block.timestamp;

        auctions[tokenId] = LiquidationAuction({
            tokenId: tokenId,
            startPriceUSD: startPrice,
            reservePriceUSD: reservePrice,
            startTime: block.timestamp,
            endTime: block.timestamp + auctionDuration,
            active: true
        });

        sagToken.setStatus(tokenId, SAGToken.CollateralStatus.Defaulted);

        emit DefaultGracePeriodEntered(tokenId, collateral.maturityTimestamp, gracePeriodEnd);
        emit LiquidationAuctionStarted(tokenId, startPrice, reservePrice, block.timestamp + auctionDuration);
    }

    /**
     * @notice Resets an expired, unsold Dutch auction with a discounted clearance floor
     * @dev If a Dutch auction completes its 24-hour duration without finding any buyer at the
     *      initial principal reserve floor (0 bids), this function permits restarting price discovery
     *      with a lower clearance floor (distressed liquidation) so that the pool can recover
     *      whatever liquidity the market will bear. Any resulting capital shortfall is absorbed
     *      by the LP pool waterfall.
     *      NOTE: liquidationInceptionTimestamp remains untouched so borrower Ujrah remains strictly frozen.
     * @param tokenId SAG Token ID
     * @param discountedReservePriceUSD New lower clearance floor in USD (must be < current reserve)
     */
    function resetExpiredAuction(uint256 tokenId, uint256 discountedReservePriceUSD) external onlyOwner {
        LiquidationAuction storage auction = auctions[tokenId];
        require(auction.active, "No active auction to reset");
        require(block.timestamp > auction.endTime, "Primary auction has not yet expired");
        require(discountedReservePriceUSD < auction.reservePriceUSD, "Discounted reserve must be below previous floor");

        // Mathematical safety floor: Prevent insider or arbitrary distress dumps below 50% of appraised value
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        uint256 minAllowedFloor = (collateral.appraisedValueUSD * MIN_DISTRESSED_RECOVERY_BPS) / 10000;
        require(
            discountedReservePriceUSD >= minAllowedFloor,
            "Discounted reserve below minimum allowable recovery floor (50% of appraisal)"
        );

        uint256 newStartPrice = auction.reservePriceUSD;

        auction.startPriceUSD = newStartPrice;
        auction.reservePriceUSD = discountedReservePriceUSD;
        auction.startTime = block.timestamp;
        auction.endTime = block.timestamp + auctionDuration;

        emit LiquidationAuctionStarted(tokenId, newStartPrice, discountedReservePriceUSD, auction.endTime);
    }

    /**
     * @notice Computes exact accrued Ujrah safekeeping fee based on elapsed physical vault custody time
     * @dev Under AAOIFI Standard 39 and Bank Negara Malaysia Rahn Policy, Ujrah accrues on a linear
     *      pro-rata basis for vault custody. Safekeeping fees permanently freeze when collateral enters
     *      liquidation auction (liquidationInceptionTimestamp) so borrowers are never charged custody
     *      fees during primary price discovery or subsequent reset rounds.
     *      accruedUjrah = (monthlyUjrahUSD * elapsedSeconds) / (30 days)
     */
    function calculateAccruedUjrah(uint256 tokenId) public view returns (uint256) {
        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);
        if (collateral.monthlyUjrahUSD == 0) return 0;
        if (block.timestamp <= collateral.originationTimestamp) return 0;

        // Permanently freeze custody fee calculation at the write-once liquidation inception timestamp
        uint256 inception = liquidationInceptionTimestamp[tokenId];
        uint256 custodyEnd = (inception > 0) ? inception : block.timestamp;

        if (custodyEnd <= collateral.originationTimestamp) return 0;
        uint256 elapsed = custodyEnd - collateral.originationTimestamp;
        return (collateral.monthlyUjrahUSD * elapsed) / (30 days);
    }

    /**
     * @notice Calculates current decaying fair-value price for a Dutch auction
     */
    function getCurrentAuctionPrice(uint256 tokenId) public view returns (uint256) {
        LiquidationAuction memory auction = auctions[tokenId];
        require(auction.active, "No active auction for token");

        if (block.timestamp >= auction.endTime) {
            return auction.reservePriceUSD;
        }

        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 totalDecay = auction.startPriceUSD - auction.reservePriceUSD;
        uint256 priceDrop = (totalDecay * elapsed) / auctionDuration;

        return auction.startPriceUSD - priceDrop;
    }

    /**
     * @notice Executes purchase of defaulted collateral via Dutch auction with Shariah surplus return
     */
    function buyLiquidatedCollateral(uint256 tokenId, uint256 maxPaymentUSD) external payable nonReentrant returns (uint256) {
        LiquidationAuction storage auction = auctions[tokenId];
        require(auction.active, "Auction is not active");

        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);

        // Compliance check: Frozen tokens/borrowers cannot complete liquidation
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        require(!sagToken.frozenAddress(collateral.borrower), "Compliance: Borrower address is frozen");

        uint256 purchasePriceUSD = getCurrentAuctionPrice(tokenId);
        require(purchasePriceUSD <= maxPaymentUSD, "Purchase price exceeds maximum slippage payment");
        require(msg.value >= purchasePriceUSD, "Insufficient payment sent");

        uint256 principalOwed = tokenLoanBalance[tokenId];
        uint256 ujrahFee = calculateAccruedUjrah(tokenId);
        uint256 totalObligation = principalOwed + ujrahFee;

        uint256 surplus = 0;
        uint256 shortfall = 0;

        if (purchasePriceUSD >= totalObligation) {
            // Surplus scenario: Shariah mandates 100% of surplus returns to the borrower
            surplus = purchasePriceUSD - totalObligation;
            tokenLoanBalance[tokenId] = 0;

            // Restores pool principal
            totalPoolLiquidity += principalOwed;

            // Pay pawnshop custodian accrued safekeeping/ujrah fee in native CTC
            if (ujrahFee > 0) {
                (bool ok, ) = collateral.pawnshop.call{value: ujrahFee}("");
                require(ok, "Transfer failed");
            }

            // Return surplus directly to borrower in native CTC
            if (surplus > 0) {
                (bool ok, ) = collateral.borrower.call{value: surplus}("");
                require(ok, "Transfer failed");
                emit SurplusReturnedToBorrower(tokenId, collateral.borrower, surplus);
            }
        } else {
            // Shortfall scenario: Proceeds do not cover total debt, absorbed by LP capital waterfall
            shortfall = totalObligation - purchasePriceUSD;
            tokenLoanBalance[tokenId] = 0;

            if (purchasePriceUSD > ujrahFee) {
                uint256 principalRecovered = purchasePriceUSD - ujrahFee;
                totalPoolLiquidity += principalRecovered;
                if (ujrahFee > 0) {
                    (bool ok, ) = collateral.pawnshop.call{value: ujrahFee}("");
                    require(ok, "Transfer failed");
                }
            }

            // Distribute shortfall to pool liquidity
            if (shortfall > totalPoolLiquidity) {
                totalPoolLiquidity = 0;
            } else {
                totalPoolLiquidity -= shortfall;
            }

            emit ShortfallDistributedToPool(tokenId, shortfall, totalPoolLiquidity);
        }

        // Refund excess payment to buyer if any
        if (msg.value > purchasePriceUSD) {
            (bool ok, ) = msg.sender.call{value: msg.value - purchasePriceUSD}("");
            require(ok, "Transfer failed");
        }

        // Close auction and update collateral status
        auction.active = false;
        sagToken.setStatus(tokenId, SAGToken.CollateralStatus.Liquidated);

        // Transfer physical gold ownership receipt (SAG NFT) to liquidator buyer
        sagToken.safeTransferFrom(collateral.pawnshop, msg.sender, tokenId);

        emit CollateralLiquidated(
            tokenId,
            msg.sender,
            purchasePriceUSD,
            principalOwed,
            ujrahFee,
            surplus,
            shortfall
        );

        return purchasePriceUSD;
    }

    /**
     * @notice Admin parameter tuning for grace period duration
     */
    function setGracePeriod(uint256 _gracePeriod) external onlyOwner {
        gracePeriod = _gracePeriod;
    }

    /**
     * @notice Returns all verified cross-chain deposits for an investor
     */
    function getInvestorProvenDeposits(address investor) external view returns (ProvenInvestorDeposit[] memory) {
        return investorProvenDeposits[investor];
    }

    /**
     * @notice Returns investor credit profile (withdrawable native LP balance vs. proven cross-chain capital)
     */

    function getLoanInvestor(uint256 tokenId) external view returns (address) {
        return loanInvestors[tokenId];
    }

    function getInvestorCreditProfile(address investor) external view returns (
        uint256 withdrawableLpBalance,
        uint256 provenCrossChainCapital,
        uint256 provenDepositCount
    ) {
        return (
            lpBalances[investor],
            investorTotalProvenCapital[investor],
            investorProvenDeposits[investor].length
        );
    }
}
