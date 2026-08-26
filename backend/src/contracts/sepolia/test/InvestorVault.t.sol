// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {InvestorVault} from "../InvestorVault.sol";

contract InvestorVaultTest is Test {
    InvestorVault public vault;
    address public owner;
    address public treasury;
    address public user1;
    address public user2;

    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);
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
        vault = new InvestorVault(treasury);
    }

    // =========================================================================
    // 1. BALANCE IS ZERO & FORWARDS TO TREASURY
    // =========================================================================

    function testFuzz_Deposit_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(user1);
        vault.deposit{value: amount}(amount);

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    function testFuzz_Receive_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(user1);
        (bool ok, ) = address(vault).call{value: amount}("");
        assertTrue(ok, "Direct send to receive() must succeed");

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    // =========================================================================
    // 2. DEPOSIT REVERTS WHEN MSG.VALUE != AMOUNT
    // =========================================================================

    function testFuzz_Deposit_Revert_MismatchedValue(uint256 amount, uint256 msgValue) public {
        amount = bound(amount, 0, 500 ether);
        msgValue = bound(msgValue, 0, 500 ether);
        vm.assume(amount != msgValue || amount == 0);

        vm.deal(user1, msgValue);
        vm.prank(user1);

        if (amount == 0) {
            vm.expectRevert("Amount must be greater than zero");
        } else {
            vm.expectRevert("msg.value does not match amount parameter");
        }

        vault.deposit{value: msgValue}(amount);
    }

    function test_Deposit_ZeroValue_Reverts() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than zero");
        vault.deposit{value: 0}(0);

        vm.prank(user1);
        vm.expectRevert("msg.value does not match amount parameter");
        vault.deposit{value: 0}(1000);
    }

    function test_Receive_ZeroValue_Reverts() public {
        vm.prank(user1);
        (bool ok, ) = address(vault).call{value: 0}("");
        assertFalse(ok, "Zero-value receive must fail");
    }

    // =========================================================================
    // 3. ONLY OWNER CAN CALL SETTREASURY / WITHDRAW
    // =========================================================================

    function testFuzz_SetTreasury_OnlyOwner(address caller, address newTreasury) public {
        vm.assume(caller != owner);
        vm.assume(newTreasury != address(0));

        vm.prank(caller);
        vm.expectRevert("Only owner");
        vault.setTreasury(newTreasury);
    }

    function test_SetTreasury_OwnerSuccess() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit TreasuryUpdated(treasury, newTreasury);
        vault.setTreasury(newTreasury);

        assertEq(vault.treasury(), newTreasury);
    }

    function test_SetTreasury_ZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("Invalid treasury address");
        vault.setTreasury(address(0));
    }

    function testFuzz_Withdraw_OnlyOwner(address caller) public {
        vm.assume(caller != owner);

        vm.prank(caller);
        vm.expectRevert("Only owner");
        vault.withdraw();
    }

    function test_Withdraw_Success_IfFundsAccidentallyHeld() public {
        // Force deal ETH into contract directly
        vm.deal(address(vault), 10 ether);
        assertEq(address(vault).balance, 10 ether);

        uint256 treasuryBefore = treasury.balance;

        vm.prank(owner);
        vault.withdraw();

        assertEq(address(vault).balance, 0, "Vault balance must be 0 after withdraw");
        assertEq(treasury.balance, treasuryBefore + 10 ether, "Treasury must receive recovered funds");
    }
}
