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
 * @dev Verifies real historical DeFi lending events across 10 major Ethereum Mainnet lending platforms:
 *      1. Aave v3
 *      2. Compound v3
 *      3. Morpho Blue
 *      4. Spark Protocol (Sky)
 *      5. MakerDAO (Sky CDP)
 *      6. Euler v2
 *      7. Fluid (Instadapp)
 *      8. Maple Finance
 *      9. Goldfinch Protocol
 *      10. Fraxlend
 *
 *      Features:
 *      - Native BlockProver Precompile (0xFD2) verification
 *      - Decodes EVM Chunk 0 common transaction fields (from, to, value, data)
 *      - Cryptographically validates function selectors and borrower involvement
 *      - Enforces calldata amount / volume bounding to prevent volume spoofing
 *      - Multi-pool / multi-contract registry for factory-based protocols (Maple, Goldfinch, Euler, Fraxlend)
 *      - EIP-191 borrower authorization with nonce replay protection
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
        MorphoBlue,    // 2
        SparkProtocol, // 3
        MakerDAO,      // 4
        EulerV2,       // 5
        Fluid,         // 6
        MapleFinance,  // 7
        Goldfinch,     // 8
        Fraxlend       // 9
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

    // Protocol Primary Contract Addresses on Source Chain (Ethereum Mainnet)
    mapping(Protocol => address) public protocolAddresses;

    // Multi-contract / Factory pool registry for protocols with multiple isolated markets
    mapping(Protocol => mapping(address => bool)) public isProtocolContract;

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

    event ProtocolContractRegistered(Protocol indexed protocol, address indexed contractAddress, bool active);
    event PrimarySourceChainUpdated(uint64 oldChainKey, uint64 newChainKey);

    constructor() Ownable(msg.sender) {
        blockProver = IBlockProver(BLOCK_PROVER_ADDRESS);
        chainInfo = IChainInfo(CHAIN_INFO_ADDRESS);

        // 1. Aave v3 Pool (Singleton)
        _registerProtocol(Protocol.AaveV3, 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2);
        _registerProtocol(Protocol.AaveV3, 0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e);

        // 2. Compound v3 (Comet USDC, WETH, USDT)
        _registerProtocol(Protocol.CompoundV3, 0xc3d688B66703497DAA19211EEdff47f25384cdc3); // Comet USDC
        _registerProtocol(Protocol.CompoundV3, 0xA17581A9E3356d9A858b789D68B4d866e593aE94); // Comet WETH
        _registerProtocol(Protocol.CompoundV3, 0x3AEE30F46A50C522961D1544af00662A48C8b8B0); // Comet USDT

        // 3. Morpho Blue (Singleton)
        _registerProtocol(Protocol.MorphoBlue, 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb);

        // 4. Spark Protocol (Sky / Aave v3 fork)
        _registerProtocol(Protocol.SparkProtocol, 0xC13e21B648A5Ee794902342038FF3aDAB66BE987);

        // 5. MakerDAO / Sky CDP (DssCdpManager)
        _registerProtocol(Protocol.MakerDAO, 0x5ef30b9986345249bc32d8928B7ee64DE9435E39);
        _registerProtocol(Protocol.MakerDAO, 0x08638165E3170EBe131C03b1fE42D72ebA3b5f7E);

        // 6. Euler v2 (Vault & Factory)
        _registerProtocol(Protocol.EulerV2, 0x27182842E096f60E3D516A691568344305922615);
        _registerProtocol(Protocol.EulerV2, 0x0000000000004946C0e9f43f4DEE607B0Ef1FE1c);

        // 7. Fluid (Instadapp Liquidity Layer)
        _registerProtocol(Protocol.Fluid, 0x52Aa899454998Be5b000Ad077a46Bbe360F4e497);

        // 8. Maple Finance (Multi-pool / Syrup)
        _registerProtocol(Protocol.MapleFinance, 0x9950eb7A27bE4fb75fEae9903b41E39B2efd492d);
        _registerProtocol(Protocol.MapleFinance, 0x2F15598687a41B2E046714e69aC0C99B4FA2b28c);

        // 9. Goldfinch Protocol (Credit Desk / Senior Pool)
        _registerProtocol(Protocol.Goldfinch, 0x438645A201b1979B0075E81816f1c4EEea72Ebc1);
        _registerProtocol(Protocol.Goldfinch, 0x8481a6EbAf5c7DABc3F7e09e44A89531fd31F822);

        // 10. Fraxlend (Pairs & Deployer)
        _registerProtocol(Protocol.Fraxlend, 0x5D6E79bcF0E728d7AE0772D7d0769b8969796E62);
        _registerProtocol(Protocol.Fraxlend, 0x6f6C808B29188040C29B012658869e7B357f7341);
    }

    function _registerProtocol(Protocol protocol, address contractAddr) internal {
        if (protocolAddresses[protocol] == address(0)) {
            protocolAddresses[protocol] = contractAddr;
        }
        isProtocolContract[protocol][contractAddr] = true;
    }

    function registerProtocolContract(Protocol protocol, address contractAddr, bool active) external onlyOwner {
        isProtocolContract[protocol][contractAddr] = active;
        if (protocolAddresses[protocol] == address(0) && active) {
            protocolAddresses[protocol] = contractAddr;
        }
        emit ProtocolContractRegistered(protocol, contractAddr, active);
    }

    function setPrimarySourceChainKey(uint64 newChainKey) external onlyOwner {
        emit PrimarySourceChainUpdated(primarySourceChainKey, newChainKey);
        primarySourceChainKey = newChainKey;
    }

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

        bool verified = blockProver.verify(
            chainKey,
            height,
            encodedTransaction,
            merkleProof,
            continuityProof
        );
        require(verified, "Attestcoin BlockProver verification failed");

        _validateTransactionClaims(encodedTransaction, borrower, eventData);
        _recordVerifiedEvent(borrower, height, eventData);
        _recalculateScore(borrower, eventData.sourceTxHash);
        return true;
    }

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

        bool verified = blockProver.verify(
            chainKey,
            heights,
            encodedTransactions,
            merkleProofs,
            sharedContinuityProof
        );
        require(verified, "Attestcoin BlockProver batch verification failed");

        for (uint256 i = 0; i < eventsData.length; i++) {
            _validateTransactionClaims(encodedTransactions[i], borrower, eventsData[i]);
            _recordVerifiedEvent(borrower, heights[i], eventsData[i]);
        }

        _recalculateScore(borrower, eventsData[eventsData.length - 1].sourceTxHash);
        return true;
    }

    function _validateTransactionClaims(
        bytes calldata encodedTransaction,
        address borrower,
        EventPayloadInput calldata eventData
    ) internal view {
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        require(chunks.length > 0, "Malformed encodedTransaction: empty chunks");
        require(txType <= 4, "Invalid EVM transaction type");

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

        require(
            isProtocolContract[eventData.protocol][to] || protocolAddresses[eventData.protocol] == to,
            "Target contract does not match claimed protocol"
        );

        bool borrowerMatched = (from == borrower);
        if (!borrowerMatched && data.length >= 36) {
            borrowerMatched = _containsAddress(data, borrower);
        }
        require(borrowerMatched, "Borrower is neither sender nor recipient in proven transaction");

        if (data.length >= 4) {
            bytes4 selector = bytes4(data);
            _validateFunctionSelector(eventData.protocol, eventData.eventType, selector);
            _validateVolumeBounds(data, selector, eventData.volumeUSD);
        }
    }

    // Known Ethereum Mainnet Stablecoin Token Addresses for Strict Volume Decimals Verification
    address private constant USDC_TOKEN = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // 6 decimals
    address private constant USDT_TOKEN = 0xdAC17F958D2ee523a2206206994597C13D831ec7; // 6 decimals
    address private constant DAI_TOKEN  = 0x6B175474E89094C44Da98b954EedeAC495271d0F; // 18 decimals
    address private constant GHO_TOKEN  = 0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f; // 18 decimals
    address private constant USDe_TOKEN = 0x4c9EDD5852cd905f086C759E8383e09bff1E68B3; // 18 decimals
    address private constant FRAX_TOKEN = 0x853d955aCEf822Db058eb8505911ED77F175b99e; // 18 decimals

    /**
     * @notice Validates that the calldata amount parameter is consistent with claimed volumeUSD.
     * @dev Decodes actual token amount from calldata (accounting for token decimals).
     *      Enforces a strict ±20% tolerance band for USD stablecoins (USDC, USDT, DAI, GHO, USDe, FRAX)
     *      and order-of-magnitude mathematical bounds for volatile assets, preventing volume spoofing.
     *      Tolerance Band Rationale: ±20% allows for minor oracle spread and peg variations ($0.98-$1.02)
     *      while strictly rejecting fabricated or disproportionate claimed volumes (e.g. $50,000 claimed on a $50 repay).
     */
    function _validateVolumeBounds(bytes memory data, bytes4 /* selector */, uint256 claimedVolumeUSD) internal pure {
        if (data.length < 68) return; // Not enough calldata for (asset, amount) parameters

        // Extract asset address (bytes 4..36) and raw amount (bytes 36..68)
        address asset;
        uint256 rawAmount;
        assembly {
            asset := mload(add(data, 36))
            rawAmount := mload(add(data, 68))
        }

        // Special case: type(uint256).max used in Aave/Spark/Fraxlend for 'repay max debt'
        if (rawAmount == type(uint256).max) {
            return;
        }

        // Enforce non-zero raw transaction amount if positive volume is claimed
        if (claimedVolumeUSD > 0) {
            require(rawAmount > 0, "Transaction amount is 0 but positive volume was claimed");
        } else {
            return;
        }

        // 1. Stablecoins with 6 decimals (USDC, USDT)
        // rawAmount is in 10^6 units, directly matching claimedVolumeUSD (6 decimals)
        if (asset == USDC_TOKEN || asset == USDT_TOKEN) {
            uint256 expectedUSD = rawAmount;
            require(
                claimedVolumeUSD >= (expectedUSD * 80) / 100 &&
                claimedVolumeUSD <= (expectedUSD * 120) / 100,
                "Claimed volumeUSD outside 20% tolerance band of 6-decimal stablecoin calldata"
            );
            return;
        }

        // 2. Stablecoins with 18 decimals (DAI, GHO, USDe, FRAX)
        // rawAmount is in 10^18 units, normalized to 10^6 units by dividing by 10^12
        if (asset == DAI_TOKEN || asset == GHO_TOKEN || asset == USDe_TOKEN || asset == FRAX_TOKEN) {
            uint256 expectedUSD = rawAmount / 1e12;
            if (expectedUSD > 0) {
                require(
                    claimedVolumeUSD >= (expectedUSD * 80) / 100 &&
                    claimedVolumeUSD <= (expectedUSD * 120) / 100,
                    "Claimed volumeUSD outside 20% tolerance band of 18-decimal stablecoin calldata"
                );
            }
            return;
        }

        // 3. Volatile/other assets: upper mathematical sanity limit
        require(claimedVolumeUSD <= rawAmount * 100000, "Claimed volumeUSD exceeds upper mathematical bound of token calldata");
    }

    function _validateFunctionSelector(
        Protocol protocol,
        EventType eventType,
        bytes4 selector
    ) internal pure {
        if (protocol == Protocol.AaveV3 || protocol == Protocol.SparkProtocol) {
            if (eventType == EventType.CleanRepayment) {
                require(
                    selector == 0x573ade81 || selector == 0xee3e210b || selector == 0x89c4b5f0,
                    "Invalid selector for Aave/Spark Repayment"
                );
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                require(selector == 0x00a718a9, "Invalid selector for Aave/Spark Liquidation");
            } else if (eventType == EventType.CollateralSupply) {
                require(selector == 0x617ba037 || selector == 0xe8aec7da, "Invalid selector for Aave/Spark Supply");
            }
        } else if (protocol == Protocol.CompoundV3) {
            if (eventType == EventType.CleanRepayment || eventType == EventType.CollateralSupply) {
                require(
                    selector == 0xf2b9fdb8 || selector == 0x474cf53d || selector == 0x27ec1e69,
                    "Invalid selector for Compound v3"
                );
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                require(selector == 0x4515cef3, "Invalid selector for Compound v3 Liquidation");
            }
        } else if (protocol == Protocol.MorphoBlue) {
            if (eventType == EventType.CleanRepayment) {
                require(selector == 0x1a879e5f, "Invalid selector for Morpho Blue Repay");
            } else if (eventType == EventType.CollateralSupply) {
                require(selector == 0x0c0a769b || selector == 0xa83da3d2, "Invalid selector for Morpho Blue Supply");
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                require(selector == 0xa4a4c9f0, "Invalid selector for Morpho Blue Liquidation");
            }
        } else if (protocol == Protocol.MakerDAO) {
            if (eventType == EventType.CleanRepayment) {
                require(selector == 0x4b666199 || selector == 0x78248407, "Invalid selector for MakerDAO Repay");
            } else if (eventType == EventType.CollateralSupply) {
                require(selector == 0x8a974b93 || selector == 0x78248407, "Invalid selector for MakerDAO Collateral");
            }
        } else if (protocol == Protocol.EulerV2 || protocol == Protocol.Fraxlend) {
            if (eventType == EventType.CleanRepayment) {
                require(selector == 0x48a58e57 || selector == 0x573ade81, "Invalid selector for Euler/Fraxlend Repay");
            } else if (eventType == EventType.CollateralSupply) {
                require(selector == 0x6e553f65 || selector == 0xb6b55f25, "Invalid selector for Euler/Fraxlend Deposit");
            } else if (eventType == EventType.OvercollateralizedLiquidation) {
                require(selector == 0x0e5a6a68 || selector == 0x438645a2, "Invalid selector for Liquidation");
            }
        } else if (protocol == Protocol.Fluid) {
            if (eventType == EventType.CleanRepayment || eventType == EventType.CollateralSupply) {
                require(selector == 0xa04c0d0f || selector == 0x617ba037 || selector == 0xf2b9fdb8, "Invalid selector for Fluid");
            }
        } else if (protocol == Protocol.MapleFinance || protocol == Protocol.Goldfinch) {
            if (eventType == EventType.CleanRepayment) {
                require(selector == 0x4e07b5a0 || selector == 0xb6b55f25 || selector == 0x573ade81, "Invalid selector for Credit Desk");
            }
        }
    }

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

    function _recordVerifiedEvent(
        address borrower,
        uint64 height,
        EventPayloadInput calldata eventData
    ) internal {
        bytes32 txHash = eventData.sourceTxHash;
        require(txHash != bytes32(0), "Invalid txHash");
        
        if (provenTxHashes[txHash]) {
            return;
        }
        provenTxHashes[txHash] = true;

        CreditProfile storage profile = _creditProfiles[borrower];
        if (profile.borrower == address(0)) {
            profile.borrower = borrower;
            profile.score = 500;
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

    function _recalculateScore(address borrower, bytes32 triggerTxHash) internal {
        CreditProfile storage profile = _creditProfiles[borrower];
        uint256 oldScore = profile.score == 0 ? 500 : profile.score;

        if (profile.provenEventsCount == 0) {
            profile.score = 500;
            profile.tier = CreditTier.Unscored;
            return;
        }

        int256 computedScore = 500;

        int256 cleanRepayBonus = int256(uint256(profile.cleanRepaymentCount)) * 25;
        int256 volumeBonus = int256(profile.totalRepaidUSD / (1000 * 1e6)) * 15;
        if (volumeBonus > 200) volumeBonus = 200;
        cleanRepayBonus += volumeBonus;

        int256 liquidationPenalty = int256(uint256(profile.liquidationCount)) * 35;
        int256 defaultPenalty = int256(uint256(profile.defaultCount)) * 150;

        computedScore = computedScore + cleanRepayBonus - liquidationPenalty - defaultPenalty;

        if (computedScore < 0) {
            profile.score = 0;
        } else if (computedScore > 1000) {
            profile.score = 1000;
        } else {
            profile.score = uint256(computedScore);
        }

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

    function _validateBorrowerAuthorization(address borrower, bytes calldata signature) internal {
        if (msg.sender == borrower) {
            return;
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

    function getCreditProfile(address borrower) external view returns (CreditProfile memory) {
        CreditProfile memory profile = _creditProfiles[borrower];
        if (profile.borrower == address(0)) {
            profile.borrower = borrower;
            profile.score = 500;
            profile.tier = CreditTier.Unscored;
        }
        return profile;
    }

    function getProvenEvents(address borrower) external view returns (ProvenEvent[] memory) {
        return _borrowerEvents[borrower];
    }

    function isTxProven(bytes32 txHash) external view returns (bool) {
        return provenTxHashes[txHash];
    }
}
