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
    address public pawnshop1;
    address public borrower1;
    address public attacker;

    event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
    event InvestorSettled(
        uint256 indexed tokenId,
        address indexed pawnshop,
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event InvestorVaultUpdated(address indexed oldVault, address indexed newVault);

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        investor1 = makeAddr("investor1");
        pawnshop1 = makeAddr("pawnshop1");
        borrower1 = makeAddr("borrower1");
        attacker = makeAddr("attacker");

        vm.deal(owner, 1000 ether);
        vm.deal(investor1, 1000 ether);
        vm.deal(pawnshop1, 1000 ether);
        vm.deal(borrower1, 1000 ether);
        vm.deal(attacker, 1000 ether);

        vm.startPrank(owner);
        vault = new InvestorVault(treasury);
        gateway = new RepaymentGateway(treasury, address(vault));
        vm.stopPrank();
    }

    // =========================================================================
    // 1. BORROWER REPAYMENT TO PAWNSHOP
    // =========================================================================

    function testFuzz_Repay_FundedLoan_RoutesDirectlyToPawnshop(uint256 tokenId, uint256 amount, uint256 appraisedUSD) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);
        appraisedUSD = bound(appraisedUSD, 1, 10_000_000);

        // 1. Investor funds pawnshop
        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, pawnshop1, appraisedUSD);

        // 2. Pawnshop disburses to borrower
        vm.prank(pawnshop1);
        vault.disburseLoan{value: amount}(tokenId, borrower1, amount);

        uint256 pawnshopBefore = pawnshop1.balance;
        uint256 treasuryBefore = treasury.balance;

        // 3. Borrower repays to pawnshop via gateway
        vm.prank(borrower1);
        gateway.repay{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(pawnshop1.balance, pawnshopBefore + amount, "Pawnshop must receive exact repayment funds");
        assertEq(treasury.balance, treasuryBefore, "Treasury must receive zero for active pawnshop loan");
        assertEq(gateway.totalRepaidForToken(tokenId), amount);
    }

    // =========================================================================
    // 2. PAWNSHOP SETTLES INVESTOR
    // =========================================================================

    function testFuzz_SettleInvestor_RoutesDirectlyToInvestor(uint256 tokenId, uint256 amount, uint256 appraisedUSD) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);
        appraisedUSD = bound(appraisedUSD, 1, 10_000_000);

        // 1. Investor funds pawnshop
        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, pawnshop1, appraisedUSD);

        // 2. Pawnshop disburses to borrower
        vm.prank(pawnshop1);
        vault.disburseLoan{value: amount}(tokenId, borrower1, amount);

        // 3. Borrower repays to pawnshop via gateway
        vm.prank(borrower1);
        gateway.repay{value: amount}(tokenId, amount);

        uint256 investorBefore = investor1.balance;

        // 4. Pawnshop settles investor via gateway
        vm.prank(pawnshop1);
        gateway.settleInvestor{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(investor1.balance, investorBefore + amount, "Investor must receive full settlement");
    }

    function test_SettleInvestor_UnauthorizedCaller_Reverts() public {
        vm.prank(investor1);
        vault.fundLoan{value: 1 ether}(1, pawnshop1, 5000);

        vm.prank(attacker);
        vm.expectRevert("Only assigned pawnshop can settle investor");
        gateway.settleInvestor{value: 1 ether}(1, 1 ether);
    }

    function test_SettleInvestor_UnfundedLoan_Reverts() public {
        vm.prank(pawnshop1);
        vm.expectRevert("Only assigned pawnshop can settle investor");
        gateway.settleInvestor{value: 1 ether}(999, 1 ether);
    }

    // =========================================================================
    // 3. FALLBACK TO TREASURY ON UNRECORDED TOKEN
    // =========================================================================

    function testFuzz_Repay_UnfundedLoan_RoutesToTreasury(uint256 tokenId, uint256 amount) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);

        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(borrower1);
        gateway.repay{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive fallback repayment");
    }

    // =========================================================================
    // 4. TOTAL REPAID MONOTONICITY & REVERTS
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

        vm.prank(borrower1);
        gateway.repay{value: amount2}(tokenId, amount2);
        uint256 r2 = gateway.totalRepaidForToken(tokenId);
        assertGe(r2, r1);
        assertEq(r2, amount1 + amount2);
    }

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
}
