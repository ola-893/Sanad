// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RepaymentGateway} from "../RepaymentGateway.sol";
import {InvestorVault} from "../InvestorVault.sol";

contract RepaymentGatewayTest is Test {
    InvestorVault public vault;
    RepaymentGateway public gateway;
    address public owner;
    address public treasury;
    address public investor1;
    address public borrower1;
    address public user2;

    event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event InvestorVaultUpdated(address indexed oldVault, address indexed newVault);

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        investor1 = makeAddr("investor1");
        borrower1 = makeAddr("borrower1");
        user2 = makeAddr("user2");

        vm.deal(owner, 1000 ether);
        vm.deal(investor1, 1000 ether);
        vm.deal(borrower1, 1000 ether);
        vm.deal(user2, 1000 ether);

        vm.startPrank(owner);
        vault = new InvestorVault(treasury);
        gateway = new RepaymentGateway(treasury, address(vault));
        vm.stopPrank();
    }

    // =========================================================================
    // 1. REPAYMENT ROUTING TO DIRECT INVESTOR OR TREASURY
    // =========================================================================

    function testFuzz_Repay_FundedLoan_RoutesDirectlyToInvestor(uint256 tokenId, uint256 amount) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);

        // Investor funds loan first
        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, borrower1);

        uint256 investorBefore = investor1.balance;
        uint256 treasuryBefore = treasury.balance;

        // Borrower repays via gateway
        vm.prank(borrower1);
        gateway.repay{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(investor1.balance, investorBefore + amount, "Investor must receive exact repayment funds");
        assertEq(treasury.balance, treasuryBefore, "Treasury must receive zero for peer-to-peer funded loan");
        assertEq(gateway.totalRepaidForToken(tokenId), amount);
    }

    function testFuzz_Repay_UnfundedLoan_RoutesToTreasury(uint256 tokenId, uint256 amount) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);

        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(borrower1);
        gateway.repay{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive fallback repayment");
    }

    function testFuzz_Receive_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(borrower1);
        (bool ok, ) = address(gateway).call{value: amount}("");
        assertTrue(ok, "Direct send to receive() must succeed");

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    // =========================================================================
    // 2. TOTAL REPAID FOR TOKEN ONLY INCREASES
    // =========================================================================

    function testFuzz_TotalRepaidForToken_MonotonicIncrease(
        uint256 tokenId,
        uint256 amount1,
        uint256 amount2
    ) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount1 = bound(amount1, 1 wei, 10 ether);
        amount2 = bound(amount2, 1 wei, 10 ether);

        uint256 r0 = gateway.totalRepaidForToken(tokenId);
        assertEq(r0, 0);

        vm.prank(borrower1);
        gateway.repay{value: amount1}(tokenId, amount1);
        uint256 r1 = gateway.totalRepaidForToken(tokenId);
        assertGe(r1, r0);
        assertEq(r1, amount1);

        vm.prank(user2);
        gateway.repay{value: amount2}(tokenId, amount2);
        uint256 r2 = gateway.totalRepaidForToken(tokenId);
        assertGe(r2, r1);
        assertEq(r2, amount1 + amount2);
    }

    // =========================================================================
    // 3. REPAY REVERTS ON MISMATCH
    // =========================================================================

    function testFuzz_Repay_Revert_MismatchedValue(uint256 tokenId, uint256 amount, uint256 msgValue) public {
        tokenId = bound(tokenId, 0, 1_000_000);
        amount = bound(amount, 0, 500 ether);
        msgValue = bound(msgValue, 0, 500 ether);
        vm.assume(amount != msgValue || amount == 0 || tokenId == 0);

        vm.deal(borrower1, msgValue);
        vm.prank(borrower1);

        if (tokenId == 0) {
            vm.expectRevert("Invalid token ID");
        } else if (amount == 0) {
            vm.expectRevert("Repayment amount must be greater than zero");
        } else {
            vm.expectRevert("msg.value does not match amount parameter");
        }

        gateway.repay{value: msgValue}(tokenId, amount);
    }

    // =========================================================================
    // 4. OWNER FUNCTIONS
    // =========================================================================

    function test_SetInvestorVault_OwnerSuccess() public {
        address newVault = makeAddr("newVault");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit InvestorVaultUpdated(address(vault), newVault);
        gateway.setInvestorVault(newVault);

        assertEq(gateway.investorVaultAddress(), newVault);
    }
}
