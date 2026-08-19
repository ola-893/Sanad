// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
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
 *         manages multi-LP capital accounting, and executes Dutch auction liquidations with strict
 *         Shariah surplus refunds to borrowers.
 */
contract SanadLiquidityPool is Ownable {
    // Creditcoin 3 Native Precompile Address for BlockProver
    address public constant BLOCK_PROVER_PRECOMPILE = address(0x0000000000000000000000000000000000000FD2);

    SAGToken public immutable sagToken;
    IERC20 public immutable liquidityCurrency; // e.g. CTC or stablecoin (USDC)

    // Liquidation & Grace Period Parameters
    uint256 public gracePeriod = 14 days;        // Grace period post-maturity before auction eligibility
    uint256 public auctionDuration = 24 hours;   // Dutch auction decay duration
    uint256 public constant MIN_DISTRESSED_RECOVERY_BPS = 5000; // Hard safety floor: 50% minimum of appraised fair market value

    // LP Capital Accounting
    mapping(address => uint256) public lpBalances;
    uint256 public totalPoolLiquidity;

    // Prevent double-spending of cross-chain source transaction proofs
    mapping(bytes32 => bool) public processedSourceTransactions;

    // Track active loan balance per SAG collateral token
    mapping(uint256 => uint256) public tokenLoanBalance;

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

    constructor(address _sagToken, address _liquidityCurrency) Ownable(msg.sender) {
        require(_sagToken != address(0), "Invalid SAG token address");
        sagToken = SAGToken(_sagToken);
        liquidityCurrency = IERC20(_liquidityCurrency);
    }

    // =========================================================================
    // LP CAPITAL ACCOUNTING (DEPOSITS & WITHDRAWALS)
    // =========================================================================

    /**
     * @notice Deposit liquidity into the pool
     */
    function depositLiquidity(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(liquidityCurrency.transferFrom(msg.sender, address(this), amount), "Deposit transfer failed");

        lpBalances[msg.sender] += amount;
        totalPoolLiquidity += amount;

        emit LiquidityDeposited(msg.sender, amount, totalPoolLiquidity);
    }

    /**
     * @notice Withdraw liquidity from the pool
     */
    function withdrawLiquidity(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(lpBalances[msg.sender] >= amount, "Insufficient LP balance");
        require(totalPoolLiquidity >= amount, "Insufficient pool liquidity");

        lpBalances[msg.sender] -= amount;
        totalPoolLiquidity -= amount;

        require(liquidityCurrency.transfer(msg.sender, amount), "Withdrawal transfer failed");

        emit LiquidityWithdrawn(msg.sender, amount, totalPoolLiquidity);
    }

    // =========================================================================
    // LOAN FUNDING & CROSS-CHAIN SETTLEMENT
    // =========================================================================

    /**
     * @notice Fund a pawnshop's tokenized gold collateral note
     */
    function fundLoan(uint256 tokenId, uint256 amount) external onlyOwner {
        require(tokenLoanBalance[tokenId] == 0, "Loan already funded");
        
        // Explicit compliance checks to prevent funding frozen collateral or frozen pawnshops
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address pawnshop = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(pawnshop), "Compliance: Pawnshop address is frozen");
        require(totalPoolLiquidity >= amount, "Insufficient pool liquidity to fund loan");

        tokenLoanBalance[tokenId] = amount;

        // Disburse liquidity to pawnshop
        require(liquidityCurrency.transfer(pawnshop, amount), "Funding transfer failed");

        emit LoanFunded(tokenId, pawnshop, amount);
    }

    /**
     * @notice Verifies an Attestcoin inclusion proof on-chain and marks the loan repaid
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
    ) external returns (bool) {
        require(!processedSourceTransactions[sourceTxHash], "Repayment transaction already settled");

        // Explicit compliance checks to block settlement on frozen loans/accounts
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        address owner = sagToken.ownerOf(tokenId);
        require(!sagToken.frozenAddress(owner), "Compliance: Owner address is frozen");

        // Execute verification against Creditcoin's native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        if (tokenLoanBalance[tokenId] <= repaidAmountUSD) {
            tokenLoanBalance[tokenId] = 0;
            sagToken.settleLoan(tokenId);

            emit CollateralUnlocked(tokenId, owner, block.timestamp);
        } else {
            tokenLoanBalance[tokenId] -= repaidAmountUSD;
        }

        emit CrossChainRepaymentVerified(tokenId, chainKey, sourceTxHash, repaidAmountUSD, block.timestamp);

        return true;
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
    function buyLiquidatedCollateral(uint256 tokenId, uint256 maxPaymentUSD) external returns (uint256) {
        LiquidationAuction storage auction = auctions[tokenId];
        require(auction.active, "Auction is not active");

        SAGToken.GoldCollateral memory collateral = sagToken.getCollateral(tokenId);

        // Compliance check: Frozen tokens/borrowers cannot complete liquidation
        require(!sagToken.frozenToken(tokenId), "Compliance: Token is frozen");
        require(!sagToken.frozenAddress(collateral.borrower), "Compliance: Borrower address is frozen");

        uint256 purchasePriceUSD = getCurrentAuctionPrice(tokenId);
        require(purchasePriceUSD <= maxPaymentUSD, "Purchase price exceeds maximum slippage payment");

        // Collect payment from buyer
        require(
            liquidityCurrency.transferFrom(msg.sender, address(this), purchasePriceUSD),
            "Payment transfer failed"
        );

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

            // Pay pawnshop custodian accrued safekeeping/ujrah fee
            if (ujrahFee > 0) {
                liquidityCurrency.transfer(collateral.pawnshop, ujrahFee);
            }

            // Return surplus directly to borrower
            if (surplus > 0) {
                require(liquidityCurrency.transfer(collateral.borrower, surplus), "Surplus refund failed");
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
                    liquidityCurrency.transfer(collateral.pawnshop, ujrahFee);
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
}
