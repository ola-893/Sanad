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
 *         Accepts cross-chain repayment proofs verified directly via native BlockProver precompile.
 */
contract SanadLiquidityPool is Ownable {
    // Creditcoin 3 Native Precompile Address for BlockProver
    address public constant BLOCK_PROVER_PRECOMPILE = address(0x0000000000000000000000000000000000000FD2);

    SAGToken public immutable sagToken;
    IERC20 public immutable liquidityCurrency; // e.g. CTC or stablecoin

    // Prevent double-spending of cross-chain source transaction proofs
    mapping(bytes32 => bool) public processedSourceTransactions;

    // Track active loan balance per SAG collateral token
    mapping(uint256 => uint256) public tokenLoanBalance;

    event LoanFunded(uint256 indexed tokenId, address indexed pawnshop, uint256 amount);
    event CrossChainRepaymentVerified(
        uint256 indexed tokenId,
        uint64 indexed chainKey,
        bytes32 indexed sourceTxHash,
        uint256 amountUSD,
        uint256 timestamp
    );
    event CollateralUnlocked(uint256 indexed tokenId, address indexed pawnshop, uint256 timestamp);

    constructor(address _sagToken, address _liquidityCurrency) Ownable(msg.sender) {
        require(_sagToken != address(0), "Invalid SAG token address");
        sagToken = SAGToken(_sagToken);
        liquidityCurrency = IERC20(_liquidityCurrency);
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

        // Execute verification against Creditcoin's native BlockProver (0xFD2)
        IBlockProver blockProver = IBlockProver(BLOCK_PROVER_PRECOMPILE);
        bool isValid = blockProver.verify(chainKey, headerNumber, encodedTransaction, merkleProof, continuityProof);
        require(isValid, "Invalid Attestcoin cross-chain proof");

        // Mark source transaction as settled to prevent replay
        processedSourceTransactions[sourceTxHash] = true;

        if (tokenLoanBalance[tokenId] <= repaidAmountUSD) {
            tokenLoanBalance[tokenId] = 0;
            sagToken.settleLoan(tokenId);

            emit CollateralUnlocked(tokenId, sagToken.ownerOf(tokenId), block.timestamp);
        } else {
            tokenLoanBalance[tokenId] -= repaidAmountUSD;
        }

        emit CrossChainRepaymentVerified(tokenId, chainKey, sourceTxHash, repaidAmountUSD, block.timestamp);

        return true;
    }

    /**
     * @notice Fund a pawnshop's tokenized gold collateral note
     */
    function fundLoan(uint256 tokenId, uint256 amount) external onlyOwner {
        require(tokenLoanBalance[tokenId] == 0, "Loan already funded");
        address pawnshop = sagToken.ownerOf(tokenId);
        tokenLoanBalance[tokenId] = amount;

        emit LoanFunded(tokenId, pawnshop, amount);
    }
}
