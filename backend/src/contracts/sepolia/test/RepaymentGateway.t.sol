// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {RepaymentGateway} from "../RepaymentGateway.sol";

contract RepaymentGatewayTest is Test {
    RepaymentGateway public gateway;
    address public owner;
    address public treasury;
    address public user1;
    address public user2;

    event RepaymentMade(address indexed borrower, uint256 indexed tokenId, uint256 amount, uint256 timestamp);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.deal(owner, 1000 ether);
        vm.deal(user1, 1000 ether);
        vm.deal(user2, 1000 ether);

        vm.prank(owner);
        gateway = new RepaymentGateway(treasury);
    }

    // =========================================================================
    // 1. BALANCE IS ZERO & FORWARDS TO TREASURY
    // =========================================================================

    function testFuzz_Repay_ValidAmount_ForwardsToTreasury(uint256 tokenId, uint256 amount) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);

        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(user1);
        gateway.repay{value: amount}(tokenId, amount);

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    function testFuzz_Receive_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(user1);
        (bool ok, ) = address(gateway).call{value: amount}("");
        assertTrue(ok, "Direct send to receive() must succeed");

        assertEq(address(gateway).balance, 0, "Gateway balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    // =========================================================================
    // 2. TOTAL REPAID FOR TOKEN ONLY INCREASES, NEVER DECREASES OR RESETS
    // =========================================================================

    function testFuzz_TotalRepaidForToken_MonotonicIncrease(
        uint256 tokenId,
        uint256 amount1,
        uint256 amount2,
        uint256 amount3
    ) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount1 = bound(amount1, 1 wei, 10 ether);
        amount2 = bound(amount2, 1 wei, 10 ether);
        amount3 = bound(amount3, 1 wei, 10 ether);

        uint256 r0 = gateway.totalRepaidForToken(tokenId);
        assertEq(r0, 0);

        vm.prank(user1);
        gateway.repay{value: amount1}(tokenId, amount1);
        uint256 r1 = gateway.totalRepaidForToken(tokenId);
        assertGe(r1, r0, "totalRepaid must increase after rep 1");
        assertEq(r1, amount1);

        vm.prank(user2);
        gateway.repay{value: amount2}(tokenId, amount2);
        uint256 r2 = gateway.totalRepaidForToken(tokenId);
        assertGe(r2, r1, "totalRepaid must increase after rep 2");
        assertEq(r2, amount1 + amount2);

        vm.prank(user1);
        gateway.repay{value: amount3}(tokenId, amount3);
        uint256 r3 = gateway.totalRepaidForToken(tokenId);
        assertGe(r3, r2, "totalRepaid must increase after rep 3");
        assertEq(r3, amount1 + amount2 + amount3);
    }

    function testFuzz_DifferentTokens_IndependentTracking(
        uint256 tokenIdA,
        uint256 tokenIdB,
        uint256 amountA,
        uint256 amountB
    ) public {
        tokenIdA = bound(tokenIdA, 1, 500_000);
        tokenIdB = bound(tokenIdB, 500_001, 1_000_000);
        amountA = bound(amountA, 1 wei, 10 ether);
        amountB = bound(amountB, 1 wei, 10 ether);

        vm.prank(user1);
        gateway.repay{value: amountA}(tokenIdA, amountA);

        assertEq(gateway.totalRepaidForToken(tokenIdA), amountA);
        assertEq(gateway.totalRepaidForToken(tokenIdB), 0);

        vm.prank(user2);
        gateway.repay{value: amountB}(tokenIdB, amountB);

        assertEq(gateway.totalRepaidForToken(tokenIdA), amountA, "Token A total must not change when Token B is repaid");
        assertEq(gateway.totalRepaidForToken(tokenIdB), amountB);
    }

    // =========================================================================
    // 3. REPAY REVERTS WHEN MSG.VALUE != AMOUNT OR TOKENID == 0
    // =========================================================================

    function testFuzz_Repay_Revert_MismatchedValue(uint256 tokenId, uint256 amount, uint256 msgValue) public {
        tokenId = bound(tokenId, 0, 1_000_000);
        amount = bound(amount, 0, 500 ether);
        msgValue = bound(msgValue, 0, 500 ether);
        vm.assume(amount != msgValue || amount == 0 || tokenId == 0);

        vm.deal(user1, msgValue);
        vm.prank(user1);

        if (tokenId == 0) {
            vm.expectRevert("Invalid token ID");
        } else if (amount == 0) {
            vm.expectRevert("Repayment amount must be greater than zero");
        } else {
            vm.expectRevert("msg.value does not match amount parameter");
        }

        gateway.repay{value: msgValue}(tokenId, amount);
    }

    function test_Repay_ZeroValue_Reverts() public {
        vm.prank(user1);
        vm.expectRevert("Invalid token ID");
        gateway.repay{value: 0}(0, 0);

        vm.prank(user1);
        vm.expectRevert("Repayment amount must be greater than zero");
        gateway.repay{value: 0}(1, 0);

        vm.prank(user1);
        vm.expectRevert("msg.value does not match amount parameter");
        gateway.repay{value: 0}(1, 1000);
    }

    // =========================================================================
    // 4. ONLY OWNER CAN CALL SETTREASURY / WITHDRAW
    // =========================================================================

    function testFuzz_SetTreasury_OnlyOwner(address caller, address newTreasury) public {
        vm.assume(caller != owner);
        vm.assume(newTreasury != address(0));

        vm.prank(caller);
        vm.expectRevert("Only owner");
        gateway.setTreasury(newTreasury);
    }

    function test_SetTreasury_OwnerSuccess() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit TreasuryUpdated(treasury, newTreasury);
        gateway.setTreasury(newTreasury);

        assertEq(gateway.treasury(), newTreasury);
    }

    function test_SetTreasury_ZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("Invalid treasury address");
        gateway.setTreasury(address(0));
    }

    function testFuzz_Withdraw_OnlyOwner(address caller) public {
        vm.assume(caller != owner);

        vm.prank(caller);
        vm.expectRevert("Only owner");
        gateway.withdraw();
    }

    function test_Withdraw_Success_IfFundsAccidentallyHeld() public {
        // Force deal ETH into contract directly
        vm.deal(address(gateway), 10 ether);
        assertEq(address(gateway).balance, 10 ether);

        uint256 treasuryBefore = treasury.balance;

        vm.prank(owner);
        gateway.withdraw();

        assertEq(address(gateway).balance, 0, "Gateway balance must be 0 after withdraw");
        assertEq(treasury.balance, treasuryBefore + 10 ether, "Treasury must receive recovered funds");
    }
}
