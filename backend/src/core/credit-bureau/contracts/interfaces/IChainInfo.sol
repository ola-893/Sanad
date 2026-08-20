// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IChainInfo
 * @notice Interface for Creditcoin 3 (CC3) native ChainInfo precompile at 0x0000000000000000000000000000000000000fD3
 * @dev Queries attestation bounds, supported chains, and finalized block checkpoints.
 */
interface IChainInfo {
    struct ChainInfoData {
        uint64 chainKey;
        uint64 chainId;
        bytes chainName;
        uint8 chainEncoding;
    }

    struct HeightHashResult {
        uint64 height;
        bytes32 hash;
        bool isAttestation;
        bool exists;
    }

    struct BoundsCheckResult {
        uint64 parentHeight;
        bytes32 parentHash;
        bool parentIsAttestation;
        uint64 childHeight;
        bytes32 childHash;
        bool childIsAttestation;
        bool isAttested;
    }

    function is_height_attested(uint64 chainKey, uint64 targetHeight) external view returns (bool);
    function get_latest_attestation_height_and_hash(uint64 chainKey) external view returns (HeightHashResult memory);
    function get_attestation_bounds(uint64 chainKey, uint64 targetHeight) external view returns (BoundsCheckResult memory);
}
