// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {InvestorVault} from "../InvestorVault.sol";

contract InvestorVaultTest is Test {
    InvestorVault public vault;
    address public owner;
    address public treasury;
    address public investor1;
    address public borrower1;

    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);
    event LoanFunded(
        uint256 indexed tokenId,
        address indexed investor,
        address indexed borrower,
        uint256 amount,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        investor1 = makeAddr("investor1");
        borrower1 = makeAddr("borrower1");

        vm.deal(owner, 1000 ether);
        vm.deal(investor1, 1000 ether);
        vm.deal(borrower1, 1000 ether);

        vm.prank(owner);
        vault = new InvestorVault(treasury);
    }

    // =========================================================================
    // 1. P2P DIRECT FUNDING
    // =========================================================================

    function testFuzz_FundLoan_DirectToBorrower(uint256 tokenId, uint256 amount) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);

        uint256 borrowerBefore = borrower1.balance;
        uint256 treasuryBefore = treasury.balance;

        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, borrower1);

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(borrower1.balance, borrowerBefore + amount, "Borrower must receive exact funding amount");
        assertEq(treasury.balance, treasuryBefore, "Treasury balance must not change on P2P funding");
        assertEq(vault.loanFunders(tokenId), investor1, "loanFunders must record investor");
    }

    function test_FundLoan_DoubleFunding_Reverts() public {
        vm.prank(investor1);
        vault.fundLoan{value: 1 ether}(1, borrower1);

        vm.prank(investor1);
        vm.expectRevert("Loan already funded");
        vault.fundLoan{value: 1 ether}(1, borrower1);
    }

    function test_FundLoan_ZeroAmountOrInvalidRecipient_Reverts() public {
        vm.prank(investor1);
        vm.expectRevert("Invalid token ID");
        vault.fundLoan{value: 1 ether}(0, borrower1);

        vm.prank(investor1);
        vm.expectRevert("Invalid borrower address");
        vault.fundLoan{value: 1 ether}(1, address(0));

        vm.prank(investor1);
        vm.expectRevert("Funding amount must be greater than zero");
        vault.fundLoan{value: 0}(1, borrower1);
    }

    // =========================================================================
    // 2. GENERAL DEPOSIT (FORWARDS TO TREASURY)
    // =========================================================================

    function testFuzz_Deposit_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(investor1);
        vault.deposit{value: amount}(amount);

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    function testFuzz_Receive_ValidAmount_ForwardsToTreasury(uint256 amount) public {
        amount = bound(amount, 1 wei, 500 ether);
        uint256 treasuryBalBefore = treasury.balance;

        vm.prank(investor1);
        (bool ok, ) = address(vault).call{value: amount}("");
        assertTrue(ok, "Direct send to receive() must succeed");

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(treasury.balance, treasuryBalBefore + amount, "Treasury must receive exact funds");
    }

    function testFuzz_Deposit_Revert_MismatchedValue(uint256 amount, uint256 msgValue) public {
        amount = bound(amount, 0, 500 ether);
        msgValue = bound(msgValue, 0, 500 ether);
        vm.assume(amount != msgValue || amount == 0);

        vm.deal(investor1, msgValue);
        vm.prank(investor1);

        if (amount == 0) {
            vm.expectRevert("Amount must be greater than zero");
        } else {
            vm.expectRevert("msg.value does not match amount parameter");
        }

        vault.deposit{value: msgValue}(amount);
    }

    // =========================================================================
    // 3. OWNER FUNCTIONS
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
}
