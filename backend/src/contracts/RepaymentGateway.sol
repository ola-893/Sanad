// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RepaymentGateway
 * @notice Source-chain smart contract deployed on Ethereum Sepolia.
 * @dev Emits repayment events that are cryptographically verified on Creditcoin using Attestcoin Protocol.
 */
contract RepaymentGateway is Ownable {
    IERC20 public immutable acceptedPaymentToken; // e.g. Sepolia USDC / USDT
    address public treasury;

    event InvoiceRepaymentReceived(
        uint256 indexed tokenId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    constructor(address _acceptedPaymentToken, address _treasury) Ownable(msg.sender) {
        acceptedPaymentToken = IERC20(_acceptedPaymentToken);
        treasury = _treasury;
    }

    /**
     * @notice Borrower or buyer repays a loan on Ethereum Sepolia
     */
    function repayInvoice(uint256 tokenId, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            acceptedPaymentToken.transferFrom(msg.sender, treasury, amount),
            "Payment transfer failed"
        );

        emit InvoiceRepaymentReceived(tokenId, msg.sender, amount, block.timestamp);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }
}
