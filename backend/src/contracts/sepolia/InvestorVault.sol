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
     * @notice Deposit funds for LP provisioning
     * @param amount Claimed deposit volume/amount (e.g. USDC / native units)
     */
    function deposit(uint256 amount) external payable {
        require(amount > 0, "Amount must be greater than zero");
        emit DepositMade(msg.sender, amount, block.timestamp);
    }

    receive() external payable {
        if (msg.value > 0) {
            emit DepositMade(msg.sender, msg.value, block.timestamp);
        }
    }
}
