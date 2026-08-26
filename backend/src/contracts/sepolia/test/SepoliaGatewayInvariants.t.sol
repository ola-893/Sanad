// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {InvestorVault} from "../InvestorVault.sol";
import {RepaymentGateway} from "../RepaymentGateway.sol";

contract GatewayHandler is Test {
    InvestorVault public vault;
    RepaymentGateway public gateway;
    address public owner;
    address public treasury;

    // Ghost state
    mapping(uint256 => uint256) public ghost_totalRepaidForToken;
    uint256[] public ghost_touchedTokens;
    mapping(uint256 => bool) private _isTokenTouched;

    constructor(InvestorVault _vault, RepaymentGateway _gateway, address _owner, address _treasury) {
        vault = _vault;
        gateway = _gateway;
        owner = _owner;
        treasury = _treasury;
    }

    function deposit(uint256 amount, bool matchMsgValue) external {
        amount = bound(amount, 1 wei, 50 ether);
        uint256 msgValue = matchMsgValue ? amount : amount + 1 wei;

        address caller = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, "investor")))));
        vm.deal(caller, msgValue);

        vm.prank(caller);
        try vault.deposit{value: msgValue}(amount) {
            // Succeeded if msgValue == amount
        } catch {
            // Reverted as expected if mismatched
        }
    }

    function repay(uint256 tokenId, uint256 amount, bool matchMsgValue) external {
        tokenId = bound(tokenId, 1, 100);
        amount = bound(amount, 1 wei, 50 ether);
        uint256 msgValue = matchMsgValue ? amount : amount + 1 wei;

        address caller = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, "borrower")))));
        vm.deal(caller, msgValue);

        if (!_isTokenTouched[tokenId]) {
            _isTokenTouched[tokenId] = true;
            ghost_touchedTokens.push(tokenId);
        }

        uint256 prevRepaid = gateway.totalRepaidForToken(tokenId);

        vm.prank(caller);
        try gateway.repay{value: msgValue}(tokenId, amount) {
            uint256 newRepaid = gateway.totalRepaidForToken(tokenId);
            require(newRepaid == prevRepaid + amount, "Repayment math mismatch");
            ghost_totalRepaidForToken[tokenId] = newRepaid;
        } catch {
            // Reverted as expected if mismatched
        }
    }

    function sendDirectEthToVault(uint256 amount) external {
        amount = bound(amount, 1 wei, 50 ether);
        address caller = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, "directVault")))));
        vm.deal(caller, amount);

        vm.prank(caller);
        (bool ok, ) = address(vault).call{value: amount}("");
        require(ok, "Direct send to vault failed");
    }

    function sendDirectEthToGateway(uint256 amount) external {
        amount = bound(amount, 1 wei, 50 ether);
        address caller = address(uint160(uint256(keccak256(abi.encodePacked(msg.sender, "directGateway")))));
        vm.deal(caller, amount);

        vm.prank(caller);
        (bool ok, ) = address(gateway).call{value: amount}("");
        require(ok, "Direct send to gateway failed");
    }

    function withdrawVault() external {
        vm.prank(owner);
        vault.withdraw();
    }

    function withdrawGateway() external {
        vm.prank(owner);
        gateway.withdraw();
    }

    function getTouchedTokensCount() external view returns (uint256) {
        return ghost_touchedTokens.length;
    }
}

contract SepoliaGatewayInvariantsTest is StdInvariant, Test {
    InvestorVault public vault;
    RepaymentGateway public gateway;
    GatewayHandler public handler;
    address public owner;
    address public treasury;

    function setUp() public {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");

        vm.deal(owner, 1000 ether);

        vm.startPrank(owner);
        vault = new InvestorVault(treasury);
        gateway = new RepaymentGateway(treasury);
        vm.stopPrank();

        handler = new GatewayHandler(vault, gateway, owner, treasury);

        targetContract(address(handler));
    }

    // =========================================================================
    // INVARIANT 1: INVESTORVAULT'S ETH BALANCE IS ALWAYS ZERO
    // =========================================================================
    function invariant_InvestorVault_BalanceIsAlwaysZero() public view {
        assertEq(
            address(vault).balance,
            0,
            "INVARIANT VIOLATION: InvestorVault ETH balance must always be zero"
        );
    }

    // =========================================================================
    // INVARIANT 2: REPAYMENTGATEWAY'S ETH BALANCE IS ALWAYS ZERO
    // =========================================================================
    function invariant_RepaymentGateway_BalanceIsAlwaysZero() public view {
        assertEq(
            address(gateway).balance,
            0,
            "INVARIANT VIOLATION: RepaymentGateway ETH balance must always be zero"
        );
    }

    // =========================================================================
    // INVARIANT 3: TOTALREPAIDFORTOKEN ONLY INCREASES, NEVER DECREASES OR RESETS
    // =========================================================================
    function invariant_TotalRepaidForToken_NeverDecreases() public view {
        uint256 count = handler.getTouchedTokensCount();
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = handler.ghost_touchedTokens(i);
            uint256 currentRepaid = gateway.totalRepaidForToken(tokenId);
            uint256 ghostRepaid = handler.ghost_totalRepaidForToken(tokenId);

            assertGe(
                currentRepaid,
                ghostRepaid,
                "INVARIANT VIOLATION: totalRepaidForToken decreased or reset"
            );
        }
    }
}
