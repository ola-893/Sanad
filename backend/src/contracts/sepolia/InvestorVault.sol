// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InvestorVault
 * @notice Minimal Sepolia Gateway contract for cross-chain liquidity provision into Sanad on Creditcoin CC3.
 *         Investors call deposit(uint256 amount) on Ethereum Sepolia, which is cryptographically proven
 *         on Creditcoin CC3 via the Attestcoin BlockProver precompile.
 */
contract InvestorVault {
    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);

    /**
     * @notice Deposit native ETH funds for LP provisioning on Creditcoin CC3.
     * @dev Function selector is 0xb6b55f25 (deposit(uint256)).
     *      Strictly enforces that msg.value is greater than zero and matches amount exactly.
     * @param amount Claimed deposit volume (must match msg.value exactly)
     */
    function deposit(uint256 amount) external payable {
        require(amount > 0, "Amount must be greater than zero");
        require(msg.value == amount, "msg.value does not match amount parameter");
        emit DepositMade(msg.sender, amount, block.timestamp);
    }

    receive() external payable {
        require(msg.value > 0, "No ETH sent");
        emit DepositMade(msg.sender, msg.value, block.timestamp);
    }
}
