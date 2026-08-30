// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {InvestorVault} from "../InvestorVault.sol";

contract InvestorVaultTest is Test {
    InvestorVault public vault;
    address public owner;
    address public treasury;
    address public investor1;
    address public pawnshop1;
    address public borrower1;
    address public attacker;

    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);
    event LoanFunded(
        uint256 indexed tokenId,
        address indexed investor,
        address indexed pawnshop,
        uint256 amount,
        uint256 appraisedValueUSD,
        uint256 timestamp
    );
    event LoanDisbursed(
        uint256 indexed tokenId,
        address indexed pawnshop,
        address indexed borrower,
        uint256 amount,
        uint256 appraisedValueUSD,
        uint256 timestamp
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

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

        vm.prank(owner);
        vault = new InvestorVault(treasury);
    }

    // =========================================================================
    // 1. P2P DIRECT FUNDING (INVESTOR -> PAWNSHOP)
    // =========================================================================

    function testFuzz_FundLoan_DirectToPawnshop(uint256 tokenId, uint256 amount, uint256 appraisedUSD) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);
        appraisedUSD = bound(appraisedUSD, 1, 10_000_000);

        uint256 pawnshopBefore = pawnshop1.balance;
        uint256 treasuryBefore = treasury.balance;

        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, pawnshop1, appraisedUSD);

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(pawnshop1.balance, pawnshopBefore + amount, "Pawnshop must receive exact funding amount");
        assertEq(treasury.balance, treasuryBefore, "Treasury balance must not change on P2P funding");
        assertEq(vault.loanFunders(tokenId), investor1, "loanFunders must record investor");
        assertEq(vault.loanPawnshops(tokenId), pawnshop1, "loanPawnshops must record pawnshop");
        assertEq(vault.loanAppraisedValue(tokenId), appraisedUSD, "loanAppraisedValue must record USD appraisal");
    }

    function test_FundLoan_DoubleFunding_Reverts() public {
        vm.prank(investor1);
        vault.fundLoan{value: 1 ether}(1, pawnshop1, 5000);

        vm.prank(investor1);
        vm.expectRevert("Loan already funded");
        vault.fundLoan{value: 1 ether}(1, pawnshop1, 5000);
    }

    function test_FundLoan_ZeroAmountOrInvalidRecipient_Reverts() public {
        vm.prank(investor1);
        vm.expectRevert("Invalid token ID");
        vault.fundLoan{value: 1 ether}(0, pawnshop1, 5000);

        vm.prank(investor1);
        vm.expectRevert("Invalid pawnshop address");
        vault.fundLoan{value: 1 ether}(1, address(0), 5000);

        vm.prank(investor1);
        vm.expectRevert("Funding amount must be greater than zero");
        vault.fundLoan{value: 0}(1, pawnshop1, 5000);
    }

    // =========================================================================
    // 2. PAWNSHOP DISBURSEMENT (PAWNSHOP -> BORROWER)
    // =========================================================================

    function testFuzz_DisburseLoan_DirectToBorrower(uint256 tokenId, uint256 amount, uint256 appraisedUSD) public {
        tokenId = bound(tokenId, 1, 1_000_000);
        amount = bound(amount, 1 wei, 500 ether);
        appraisedUSD = bound(appraisedUSD, 1, 10_000_000);

        // 1. Investor funds pawnshop
        vm.prank(investor1);
        vault.fundLoan{value: amount}(tokenId, pawnshop1, appraisedUSD);

        uint256 borrowerBefore = borrower1.balance;

        // 2. Pawnshop disburses to borrower
        vm.prank(pawnshop1);
        vault.disburseLoan{value: amount}(tokenId, borrower1, amount);

        assertEq(address(vault).balance, 0, "Vault balance must be zero");
        assertEq(borrower1.balance, borrowerBefore + amount, "Borrower must receive exact disbursement");
        assertTrue(vault.loanDisbursed(tokenId), "loanDisbursed must be true");
    }

    function test_DisburseLoan_UnauthorizedCaller_Reverts() public {
        vm.prank(investor1);
        vault.fundLoan{value: 1 ether}(1, pawnshop1, 5000);

        vm.prank(attacker);
        vm.expectRevert("Only assigned pawnshop can disburse");
        vault.disburseLoan{value: 1 ether}(1, borrower1, 1 ether);
    }

    function test_DisburseLoan_DoubleDisbursement_Reverts() public {
        vm.prank(investor1);
        vault.fundLoan{value: 1 ether}(1, pawnshop1, 5000);

        vm.prank(pawnshop1);
        vault.disburseLoan{value: 1 ether}(1, borrower1, 1 ether);

        vm.prank(pawnshop1);
        vm.expectRevert("Loan already disbursed");
        vault.disburseLoan{value: 1 ether}(1, borrower1, 1 ether);
    }

    // =========================================================================
    // 3. GENERAL DEPOSIT (TREASURY ROUTING)
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

    // =========================================================================
    // 4. OWNER FUNCTIONS
    // =========================================================================

    function test_SetTreasury_OwnerSuccess() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit TreasuryUpdated(treasury, newTreasury);
        vault.setTreasury(newTreasury);

        assertEq(vault.treasury(), newTreasury);
    }
}
