// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {SanadLiquidityPool, IBlockProver} from "cc3/SanadLiquidityPool.sol";
import {SAGToken} from "cc3/SAGToken.sol";
import {InvestorVault} from "../InvestorVault.sol";

contract MockBlockProver is IBlockProver {
    function verify(
        uint64,
        uint64,
        bytes calldata,
        MerkleProof calldata,
        ContinuityProof calldata
    ) external pure override returns (bool) {
        return true;
    }

    function verifyAndEmit(
        uint64,
        uint64,
        bytes calldata,
        MerkleProof calldata,
        ContinuityProof calldata
    ) external pure override returns (bool) {
        return true;
    }
}

contract SanadLiquidityPoolVerificationTest is Test {
    SanadLiquidityPool public pool;
    SAGToken public sagToken;
    InvestorVault public vault;

    address public owner;
    address public pawnshop;
    address public borrower;
    address public investor;

    address public constant BLOCK_PROVER_PRECOMPILE = address(0x0000000000000000000000000000000000000FD2);

    function setUp() public {
        owner = makeAddr("owner");
        pawnshop = makeAddr("pawnshop");
        borrower = makeAddr("borrower");
        investor = makeAddr("investor");

        // Deploy Mock BlockProver at 0xFD2
        MockBlockProver mockProver = new MockBlockProver();
        vm.etch(BLOCK_PROVER_PRECOMPILE, address(mockProver).code);

        vm.startPrank(owner);
        sagToken = new SAGToken();
        pool = new SanadLiquidityPool(address(sagToken));
        vault = new InvestorVault(owner);

        // Grant roles
        sagToken.grantRole(sagToken.MINTER_ROLE(), owner);
        sagToken.grantRole(sagToken.MINTER_ROLE(), address(pool));
        sagToken.grantRole(sagToken.SETTLEMENT_ROLE(), address(pool));

        pool.setInvestorVaultAddress(address(vault));
        vm.stopPrank();
    }

    function _buildEncodedTransaction(
        address from,
        address to,
        uint256 value,
        bytes memory data,
        uint8 receiptStatus
    ) internal pure returns (bytes memory) {
        // Chunk 0: (uint64 nonce, uint64 gasLimit, address from, bool toIsNull, address to, uint256 value, bytes data)
        bytes memory chunk0 = abi.encode(
            uint64(0),
            uint64(100000),
            from,
            false,
            to,
            value,
            data
        );

        // Receipt chunk: (uint8 receiptStatus)
        bytes memory receiptChunk = abi.encode(receiptStatus);

        bytes[] memory chunks = new bytes[](2);
        chunks[0] = chunk0;
        chunks[1] = receiptChunk;

        // txType = 2 (EIP-1559), chunks
        return abi.encode(uint8(2), chunks);
    }

    // =========================================================================
    // 1. EXACT 6-DECIMAL APPRAISED VALUE CROSS-CHECK (6 Decimals: $3,500 = 3,500,000,000)
    // =========================================================================

    function test_VerifyAndFundLoan_Matching6DecimalAppraisal_Succeeds() public {
        // 1. Mint SAG NFT on CC3 with 6-decimal valuation: $3,500 = 3,500,000,000
        uint256 appraisal6Decimals = 3500 * 10**6; // 3,500,000,000
        vm.prank(owner);
        uint256 tokenId = sagToken.mintCollateral(
            SAGToken.MintParams({
                pawnshop: pawnshop,
                borrower: borrower,
                weightGrams: 5000,
                karat: 24,
                appraisedValueUSD: appraisal6Decimals,
                loanAmount: 2500 * 10**6,
                tenureDays: 30,
                monthlyUjrahUSD: 25 * 10**6,
                ipfsUri: "ipfs://test"
            })
        );

        // 2. Build calldata for fundLoan(tokenId, pawnshop, appraisal6Decimals)
        bytes memory calldataData = abi.encodeWithSelector(
            vault.fundLoan.selector,
            tokenId,
            pawnshop,
            appraisal6Decimals
        );

        bytes memory encodedTx = _buildEncodedTransaction(
            investor,
            address(vault),
            1 ether,
            calldataData,
            1 // receiptStatus = 1 (success)
        );

        IBlockProver.MerkleProof memory merkleProof;
        IBlockProver.ContinuityProof memory continuityProof;
        bytes32 txHash = keccak256("testTxHash");

        // 3. Verify cross-chain proof on CC3
        bool success = pool.verifyAndFundLoanCrossChain(
            tokenId,
            1, // chainKey
            100, // headerNumber
            encodedTx,
            merkleProof,
            continuityProof,
            txHash
        );

        assertTrue(success, "Cross-chain verification must succeed when 6-decimal appraisal matches");
        assertEq(pool.tokenLoanBalance(tokenId), 1 ether);
        assertEq(pool.loanInvestors(tokenId), investor);
        assertEq(pool.investorTotalProvenCapital(investor), 1 ether);
    }

    // =========================================================================
    // 2. FRAUD / SCALE MISMATCH ATTACK REJECTIONS
    // =========================================================================

    function test_VerifyAndFundLoan_UnscaledAppraisalAttack_Reverts() public {
        // 1. Mint SAG NFT on CC3 with 6-decimal valuation: $3,500 = 3,500,000,000
        uint256 appraisal6Decimals = 3500 * 10**6; // 3,500,000,000
        vm.prank(owner);
        uint256 tokenId = sagToken.mintCollateral(
            SAGToken.MintParams({
                pawnshop: pawnshop,
                borrower: borrower,
                weightGrams: 5000,
                karat: 24,
                appraisedValueUSD: appraisal6Decimals,
                loanAmount: 2500 * 10**6,
                tenureDays: 30,
                monthlyUjrahUSD: 25 * 10**6,
                ipfsUri: "ipfs://test"
            })
        );

        // 2. Attacker provides proof with unscaled raw 3500
        uint256 unscaledAppraisal = 3500;
        bytes memory calldataData = abi.encodeWithSelector(
            vault.fundLoan.selector,
            tokenId,
            pawnshop,
            unscaledAppraisal
        );

        bytes memory encodedTx = _buildEncodedTransaction(
            investor,
            address(vault),
            1 ether,
            calldataData,
            1
        );

        IBlockProver.MerkleProof memory merkleProof;
        IBlockProver.ContinuityProof memory continuityProof;
        bytes32 txHash = keccak256("attackTxHash1");

        // 3. Must revert with appraisal mismatch!
        vm.expectRevert("Appraised value USD mismatch with SAG collateral note");
        pool.verifyAndFundLoanCrossChain(
            tokenId,
            1,
            100,
            encodedTx,
            merkleProof,
            continuityProof,
            txHash
        );
    }

    function test_VerifyAndFundLoan_ManipulatedAppraisalAttack_Reverts() public {
        // 1. Mint SAG NFT on CC3 with 6-decimal valuation: $3,500 = 3,500,000,000
        uint256 appraisal6Decimals = 3500 * 10**6;
        vm.prank(owner);
        uint256 tokenId = sagToken.mintCollateral(
            SAGToken.MintParams({
                pawnshop: pawnshop,
                borrower: borrower,
                weightGrams: 5000,
                karat: 24,
                appraisedValueUSD: appraisal6Decimals,
                loanAmount: 2500 * 10**6,
                tenureDays: 30,
                monthlyUjrahUSD: 25 * 10**6,
                ipfsUri: "ipfs://test"
            })
        );

        // 2. Attacker provides inflated appraisal of $7,000 (7,000,000,000)
        uint256 inflatedAppraisal = 7000 * 10**6;
        bytes memory calldataData = abi.encodeWithSelector(
            vault.fundLoan.selector,
            tokenId,
            pawnshop,
            inflatedAppraisal
        );

        bytes memory encodedTx = _buildEncodedTransaction(
            investor,
            address(vault),
            1 ether,
            calldataData,
            1
        );

        IBlockProver.MerkleProof memory merkleProof;
        IBlockProver.ContinuityProof memory continuityProof;
        bytes32 txHash = keccak256("attackTxHash2");

        // 3. Must revert with appraisal mismatch!
        vm.expectRevert("Appraised value USD mismatch with SAG collateral note");
        pool.verifyAndFundLoanCrossChain(
            tokenId,
            1,
            100,
            encodedTx,
            merkleProof,
            continuityProof,
            txHash
        );
    }

    function test_VerifyAndFundLoan_WrongPawnshop_Reverts() public {
        uint256 appraisal6Decimals = 3500 * 10**6;
        vm.prank(owner);
        uint256 tokenId = sagToken.mintCollateral(
            SAGToken.MintParams({
                pawnshop: pawnshop,
                borrower: borrower,
                weightGrams: 5000,
                karat: 24,
                appraisedValueUSD: appraisal6Decimals,
                loanAmount: 2500 * 10**6,
                tenureDays: 30,
                monthlyUjrahUSD: 25 * 10**6,
                ipfsUri: "ipfs://test"
            })
        );

        address wrongPawnshop = makeAddr("wrongPawnshop");
        bytes memory calldataData = abi.encodeWithSelector(
            vault.fundLoan.selector,
            tokenId,
            wrongPawnshop,
            appraisal6Decimals
        );

        bytes memory encodedTx = _buildEncodedTransaction(
            investor,
            address(vault),
            1 ether,
            calldataData,
            1
        );

        IBlockProver.MerkleProof memory merkleProof;
        IBlockProver.ContinuityProof memory continuityProof;
        bytes32 txHash = keccak256("attackTxHash3");

        vm.expectRevert("Pawnshop in calldata does not match token owner");
        pool.verifyAndFundLoanCrossChain(
            tokenId,
            1,
            100,
            encodedTx,
            merkleProof,
            continuityProof,
            txHash
        );
    }
}
