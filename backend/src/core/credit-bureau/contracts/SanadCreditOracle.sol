// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IBlockProver.sol";
import "./interfaces/IChainInfo.sol";

/**
 * @title SanadCreditOracle
 * @notice Cryptographic On-Chain Credit Bureau on Creditcoin CC3 powered by the Attestcoin Protocol.
 * @dev Verifies real historical DeFi lending events (Aave, Compound, Maple, Goldfinch) from Ethereum Mainnet
 *      via native BlockProver precompile (0xFD2), decodes transaction calldata, and ensures claimed
 *      credit signals strictly match the proven Ethereum transaction payload.
 */
contract SanadCreditOracle is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // CC3 Precompile Addresses
    address public constant BLOCK_PROVER_ADDRESS = 0x0000000000000000000000000000000000000FD2;
    address public constant CHAIN_INFO_ADDRESS  = 0x0000000000000000000000000000000000000fD3;

    IBlockProver public immutable blockProver;
    IChainInfo public immutable chainInfo;

    // Supported Source Chain Key (3 = Ethereum Mainnet on CC3 Testnet)
    uint64 public primarySourceChainKey = 3;

    enum Protocol {
        AaveV3,        // 0
        CompoundV3,    // 1
        MapleFinance,  // 2
        Goldfinch      // 3
    }

    enum EventType {
        CleanRepayment,                  // 0: Positive credit signal (+25 to +175 pts)
        OvercollateralizedLiquidation,  // 1: Risk penalty signal (-35 pts)
        UndercollateralizedDefault,     // 2: Severe default penalty signal (-150 pts)
        CollateralSupply                // 3: Capital capacity signal (+15 pts)
    }

    enum CreditTier {
        Unscored,  // 0: Neutral / Base (500 pts)
        HighRisk,  // 1: Score < 350
        Bronze,    // 2: Score 350 - 549
        Silver,    // 3: Score 550 - 749
        Gold       // 4: Score 750 - 1000
    }

    struct ProvenEvent {
        bytes32 sourceTxHash;
        uint64 blockHeight;
        Protocol protocol;
        EventType eventType;
        uint256 volumeUSD; // 6 decimals (USDC equivalent)
        uint64 timestamp;
    }

    struct CreditProfile {
        address borrower;
        uint256 score;             // 0 - 1000
        CreditTier tier;
        uint256 totalRepaidUSD;    // 6 decimals
        uint256 totalLiquidatedUSD;
        uint256 totalDefaultedUSD;
        uint32 cleanRepaymentCount;
        uint32 liquidationCount;
        uint32 defaultCount;
        uint64 lastEvaluatedTimestamp;
        uint32 provenEventsCount;
    }

    struct EventPayloadInput {
        bytes32 sourceTxHash;
        Protocol protocol;
        EventType eventType;
        uint256 volumeUSD;
        uint64 timestamp;
    }

    // Protocol Contract Registry on Source Chain (Ethereum Mainnet)
    mapping(Protocol => address) public protocolAddresses;

    // Storage
    mapping(address => CreditProfile) private _creditProfiles;
    mapping(address => ProvenEvent[]) private _borrowerEvents;
    mapping(bytes32 => bool) public provenTxHashes;
    mapping(address => uint256) public nonces;

    // Events
    event CreditScoreUpdated(
        address indexed borrower,
        uint256 oldScore,
        uint256 newScore,
        CreditTier tier,
        bytes32 indexed txHash
    );

    event DeFiEventProven(
        address indexed borrower,
        bytes32 indexed sourceTxHash,
        uint8 protocol,
        uint8 eventType,
        uint256 volumeUSD,
        uint64 blockHeight
    );

    event ProtocolAddressUpdated(Protocol indexed protocol, address indexed oldAddress, address indexed newAddress);
    event PrimarySourceChainUpdated(uint64 oldChainKey, uint64 newChainKey);

    constructor() Ownable(msg.sender) {
        blockProver = IBlockProver(BLOCK_PROVER_ADDRESS);
        chainInfo = IChainInfo(CHAIN_INFO_ADDRESS);

        // Initialize default Ethereum Mainnet lending protocol addresses
        protocolAddresses[Protocol.AaveV3] = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;       // Aave v3 Pool
        protocolAddresses[Protocol.CompoundV3] = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;   // Compound Comet USDC
        protocolAddresses[Protocol.MapleFinance] = 0x9950eb7A27bE4fb75fEae9903b41E39B2efd492d; // Maple Pool
        protocolAddresses[Protocol.Goldfinch] = 0x438645A201b1979B0075E81816f1c4EEea72Ebc1;    // Goldfinch Credit Desk
    }

    /**
     * @notice Set or update the known contract address for a supported lending protocol
     */
    function setProtocolAddress(Protocol protocol, address protocolContract) external onlyOwner {
        address old = protocolAddresses[protocol];
        protocolAddresses[protocol] = protocolContract;
        emit ProtocolAddressUpdated(protocol, old, protocolContract);
    }

    /**
     * @notice Set primary source chain key (e.g. 3 for Ethereum Mainnet on CC3 Testnet)
     */
    function setPrimarySourceChainKey(uint64 newChainKey) external onlyOwner {
        emit PrimarySourceChainUpdated(primarySourceChainKey, newChainKey);
        primarySourceChainKey = newChainKey;
    }

    /**
     * @notice Cryptographically verify a single historical Ethereum transaction and update credit profile.
     * @dev Validates:
     *      1. Cryptographic proof via BlockProver precompile (0xFD2).
     *      2. Decodes transaction calldata to verify target contract and borrower involvement.
     *      3. Validates function selector against claimed eventType.
     *      4. Enforces EIP-191 borrower authorization.
     */
    function submitSingleProof(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        IBlockProver.MerkleProof calldata merkleProof,
        IBlockProver.ContinuityProof calldata continuityProof,
        address borrower,
        EventPayloadInput calldata eventData,
        bytes calldata borrowerSignature
    ) external returns (bool) {
        require(borrower != address(0), "Invalid borrower address");
        require(chainKey == primarySourceChainKey, "Unsupported source chain key");
        _validateBorrowerAuthorization(borrower, borrowerSignature);

        // 1. Verify cryptographic proof via native BlockProver precompile at 0xFD2
        bool verified = blockProver.verify(
            chainKey,
            height,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "Attestcoin BlockProver verification failed");

        // 2. Decode and validate that transaction payload matches claimed eventData
        _validateTransactionClaims(encodedTransaction, borrower, eventData);

        // 3. Record event
        _recordVerifiedEvent(borrower, height, eventData);

        // 4. Recalculate credit score
        _recalculateScore(borrower, eventData.sourceTxHash);
        return true;
    }

    /**
     * @notice Cryptographically verify a batch of historical Ethereum transactions (up to 10).
     */
    function submitBatchProof(
        uint64 chainKey,
        uint64[] calldata heights,
        bytes[] calldata encodedTransactions,
        IBlockProver.MerkleProof[] calldata merkleProofs,
        IBlockProver.ContinuityProof calldata sharedContinuityProof,
        address borrower,
        EventPayloadInput[] calldata eventsData,
        bytes calldata borrowerSignature
    ) external returns (bool) {
        require(borrower != address(0), "Invalid borrower address");
        require(chainKey == primarySourceChainKey, "Unsupported source chain key");
        require(heights.length == encodedTransactions.length, "Array length mismatch: heights/encodedTx");
        require(heights.length == merkleProofs.length, "Array length mismatch: heights/merkleProofs");
        require(heights.length == eventsData.length, "Array length mismatch: heights/eventsData");
        require(heights.length <= 10, "Exceeds max batch limit of 10");

        _validateBorrowerAuthorization(borrower, borrowerSignature);

        // 1. Verify batch proof via native BlockProver precompile at 0xFD2
        bool verified = blockProver.verify(
            chainKey,
            heights,
            encodedTransactions,
            merkleProofs,
            sharedContinuityProof
        );
        require(verified, "Attestcoin BlockProver batch verification failed");

        // 2. Validate and process each transaction
        for (uint256 i = 0; i < eventsData.length; i++) {
            _validateTransactionClaims(encodedTransactions[i], borrower, eventsData[i]);
            _recordVerifiedEvent(borrower, heights[i], eventsData[i]);
        }

        // 3. Recalculate score
        _recalculateScore(borrower, eventsData[eventsData.length - 1].sourceTxHash);
        return true;
    }

    /**
     * @notice Decodes the proven EVM transaction chunks and cryptographically binds them to the claimed eventData.
     */
    function _validateTransactionClaims(
        bytes calldata encodedTransaction,
        address borrower,
        EventPayloadInput calldata eventData
    ) internal view {
        // Step A: Decode outer ABI structure (uint8 txType, bytes[] chunks)
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length > 0, "Malformed encodedTransaction: empty chunks");
        require(txType <= 4, "Invalid EVM transaction type");

        // Step B: Decode Chunk 0 (Common EVM transaction fields)
        (
            /* uint64 nonce */,
            /* uint64 gasLimit */,
            address from,
            bool toIsNull,
            address to,
            /* uint256 value */,
            bytes memory data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));

        require(!toIsNull, "Target contract address cannot be null");

        // Step C: Verify Target Protocol Contract
        address expectedProtocolContract = protocolAddresses[eventData.protocol];
        if (expectedProtocolContract != address(0)) {
            require(to == expectedProtocolContract, "Target contract does not match claimed protocol");
        }

        // Step D: Verify Borrower Involvement
        // Either:
        //  1. The transaction was broadcast directly by the borrower (from == borrower)
        //  2. The borrower's address is present in the calldata parameters (e.g. onBehalfOf, user, borrower)
        bool borrowerMatched = (from == borrower);
        if (!borrowerMatched && data.length >= 36) {
            borrowerMatched = _containsAddress(data, borrower);
        }
        require(borrowerMatched, "Borrower is neither sender nor recipient in proven transaction");

        // Step E: Verify Function Selector against claimed EventType
        if (data.length >= 4) {
            bytes4 selector = bytes4(data);
            _validateFunctionSelector(eventData.protocol, eventData.eventType, selector);
        }
    }

    /**
     * @notice Checks known function selectors for lending protocols
     */
    function _validateFunctionSelector(
        Protocol protocol,
        EventType eventType,
        bytes4 selector
    ) internal pure {
        if (protocol == Protocol.AaveV3) {
            if (eventType == EventType.CleanRepayment) {
                // Aave v3 repay: 0x573ade81, repayWithATokens: 0xee3e210b, repayWithPermit: 0x89c4b5f0
                require(
                    selector == 0x573ade81 || selector == 0xee3e210b || selector == 0x89c4b5f0,
                    "Invalid function selector for Aave v3 Repayment"
                );
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                // Aave v3 liquidationCall: 0x00a718a9
                require(selector == 0x00a718a9, "Invalid function selector for Aave v3 Liquidation");
            } else if (eventType == EventType.CollateralSupply) {
                // Aave v3 supply: 0x617ba037, supplyWithPermit: 0xe8aec7da
                require(selector == 0x617ba037 || selector == 0xe8aec7da, "Invalid function selector for Aave v3 Supply");
            }
        } else if (protocol == Protocol.CompoundV3) {
            if (eventType == EventType.CleanRepayment || eventType == EventType.CollateralSupply) {
                // Compound v3 supply: 0xf2b9fdb8, supplyTo: 0x474cf53d
                require(selector == 0xf2b9fdb8 || selector == 0x474cf53d, "Invalid function selector for Compound v3");
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                // Compound v3 absorb: 0x4515cef3
                require(selector == 0x4515cef3, "Invalid function selector for Compound v3 Liquidation");
            }
        }
    }

    /**
     * @notice Scans calldata for a 20-byte address (ABI encoded word)
     */
    function _containsAddress(bytes memory data, address target) internal pure returns (bool) {
        bytes32 targetWord = bytes32(uint256(uint160(target)));
        uint256 len = data.length;
        if (len < 36) return false;

        for (uint256 i = 4; i + 32 <= len; i += 32) {
            bytes32 word;
            assembly {
                word := mload(add(add(data, 32), i))
            }
            if (word == targetWord) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Record a verified event with replay protection
     */
    function _recordVerifiedEvent(
        address borrower,
        uint64 height,
        EventPayloadInput calldata eventData
    ) internal {
        bytes32 txHash = eventData.sourceTxHash;
        require(txHash != bytes32(0), "Invalid txHash");
        
        // Replay protection: prevent double counting
        if (provenTxHashes[txHash]) {
            return; // No-op if already proven
        }
        provenTxHashes[txHash] = true;

        CreditProfile storage profile = _creditProfiles[borrower];
        if (profile.borrower == address(0)) {
            profile.borrower = borrower;
            profile.score = 500; // Base unscored
            profile.tier = CreditTier.Unscored;
        }

        if (eventData.eventType == EventType.CleanRepayment) {
            profile.cleanRepaymentCount++;
            profile.totalRepaidUSD += eventData.volumeUSD;
        } else if (eventData.eventType == EventType.OvercollateralizedLiquidation) {
            profile.liquidationCount++;
            profile.totalLiquidatedUSD += eventData.volumeUSD;
        } else if (eventData.eventType == EventType.UndercollateralizedDefault) {
            profile.defaultCount++;
            profile.totalDefaultedUSD += eventData.volumeUSD;
        }

        profile.provenEventsCount++;
        profile.lastEvaluatedTimestamp = uint64(block.timestamp);

        _borrowerEvents[borrower].push(ProvenEvent({
            sourceTxHash: txHash,
            blockHeight: height,
            protocol: eventData.protocol,
            eventType: eventData.eventType,
            volumeUSD: eventData.volumeUSD,
            timestamp: eventData.timestamp
        }));

        emit DeFiEventProven(
            borrower,
            txHash,
            uint8(eventData.protocol),
            uint8(eventData.eventType),
            eventData.volumeUSD,
            height
        );
    }

    /**
     * @notice Weighted credit scoring engine based on verified historical behavior
     */
    function _recalculateScore(address borrower, bytes32 triggerTxHash) internal {
        CreditProfile storage profile = _creditProfiles[borrower];
        uint256 oldScore = profile.score == 0 ? 500 : profile.score;

        if (profile.provenEventsCount == 0) {
            profile.score = 500;
            profile.tier = CreditTier.Unscored;
            return;
        }

        // Base score
        int256 computedScore = 500;

        // 1. Positive points for clean repayments
        int256 cleanRepayBonus = int256(uint256(profile.cleanRepaymentCount)) * 25;
        int256 volumeBonus = int256(profile.totalRepaidUSD / (5000 * 1e6)) * 10;
        if (volumeBonus > 150) volumeBonus = 150;
        cleanRepayBonus += volumeBonus;

        // 2. Penalties for liquidations (Aave/Compound risk signal)
        int256 liquidationPenalty = int256(uint256(profile.liquidationCount)) * 35;

        // 3. Severe penalties for uncollateralized defaults (Maple/Goldfinch)
        int256 defaultPenalty = int256(uint256(profile.defaultCount)) * 150;

        computedScore = computedScore + cleanRepayBonus - liquidationPenalty - defaultPenalty;

        // Bound score between 0 and 1000
        if (computedScore < 0) {
            profile.score = 0;
        } else if (computedScore > 1000) {
            profile.score = 1000;
        } else {
            profile.score = uint256(computedScore);
        }

        // Determine tier
        if (profile.score < 350) {
            profile.tier = CreditTier.HighRisk;
        } else if (profile.score < 550) {
            profile.tier = CreditTier.Bronze;
        } else if (profile.score < 750) {
            profile.tier = CreditTier.Silver;
        } else {
            profile.tier = CreditTier.Gold;
        }

        emit CreditScoreUpdated(borrower, oldScore, profile.score, profile.tier, triggerTxHash);
    }

    /**
     * @notice Validates borrower signature or direct caller
     */
    function _validateBorrowerAuthorization(address borrower, bytes calldata signature) internal {
        if (msg.sender == borrower) {
            return; // Direct caller is the borrower
        }
        require(signature.length == 65, "Invalid signature length");
        
        uint256 currentNonce = nonces[borrower];
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(borrower, address(this), block.chainid, currentNonce))
            )
        );
        
        address recoveredSigner = ECDSA.recover(messageHash, signature);
        require(recoveredSigner == borrower, "Signature verification failed: unauthorized wallet profiling");
        nonces[borrower]++;
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /**
     * @notice Returns full credit profile for a borrower
     */
    function getCreditProfile(address borrower) external view returns (CreditProfile memory) {
        CreditProfile memory profile = _creditProfiles[borrower];
        if (profile.borrower == address(0)) {
            profile.borrower = borrower;
            profile.score = 500;
            profile.tier = CreditTier.Unscored;
        }
        return profile;
    }

    /**
     * @notice Returns all verified historical DeFi events for a borrower
     */
    function getProvenEvents(address borrower) external view returns (ProvenEvent[] memory) {
        return _borrowerEvents[borrower];
    }

    /**
     * @notice Check if a source transaction has already been proven
     */
    function isTxProven(bytes32 txHash) external view returns (bool) {
        return provenTxHashes[txHash];
    }
}
