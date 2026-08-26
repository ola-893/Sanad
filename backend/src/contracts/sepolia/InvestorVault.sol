// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InvestorVault
 * @notice Minimal Sepolia Gateway contract for cross-chain liquidity provision into Sanad on Creditcoin CC3.
 *         Investors call deposit(uint256 amount) on Ethereum Sepolia, which is cryptographically proven
 *         on Creditcoin CC3 via the Attestcoin BlockProver precompile.
 */
contract InvestorVault {
    address public owner;
    address public treasury;

    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : msg.sender;
    }

    /**
     * @notice Deposit native ETH funds for LP provisioning on Creditcoin CC3.
     * @dev Function selector is 0xb6b55f25 (deposit(uint256)).
     *      Strictly enforces that msg.value is greater than zero and matches amount exactly.
     *      Immediately forwards funds to treasury address.
     * @param amount Claimed deposit volume (must match msg.value exactly)
     */
    function deposit(uint256 amount) external payable {
        require(amount > 0, "Amount must be greater than zero");
        require(msg.value == amount, "msg.value does not match amount parameter");

        if (treasury != address(this)) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "Transfer to treasury failed");
        }

        emit DepositMade(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Update treasury destination address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Recover accidental native funds
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool ok, ) = treasury.call{value: balance}("");
            require(ok, "Withdraw failed");
        }
    }

    receive() external payable {
        require(msg.value > 0, "No ETH sent");
        if (treasury != address(this)) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "Transfer to treasury failed");
        }
        emit DepositMade(msg.sender, msg.value, block.timestamp);
    }
}
