// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RepaymentGateway
 * @notice Ethereum Sepolia Gateway for cross-chain debt repayments of Sanad SAG loans on Creditcoin 3.
 * @dev Emits RepaymentMade events that are cryptographically verified on Creditcoin CC3
 *      via the native BlockProver precompile (0xFD2) and Attestcoin Protocol (chainKey: 1).
 */
contract RepaymentGateway {
    address public owner;
    address public treasury;

    // Total repayments tracked per loan token ID
    mapping(uint256 => uint256) public totalRepaidForToken;

    event RepaymentMade(
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 timestamp
    );

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
     * @notice Repays an active Sanad loan for a specific SAG Token ID on Sepolia.
     * @dev Function selector is 0xd8aed145 (repay(uint256,uint256)).
     *      Strictly enforces that msg.value is greater than zero and matches amount unconditionally.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param amount Amount repaid (must match msg.value in wei)
     */
    function repay(uint256 tokenId, uint256 amount) external payable {
        require(tokenId > 0, "Invalid token ID");
        require(amount > 0, "Repayment amount must be greater than zero");
        require(msg.value == amount, "msg.value does not match amount parameter");

        if (treasury != address(this)) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "Transfer to treasury failed");
        }

        totalRepaidForToken[tokenId] += amount;

        emit RepaymentMade(msg.sender, tokenId, amount, block.timestamp);
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
        if (treasury != address(this) && msg.value > 0) {
            (bool ok, ) = treasury.call{value: msg.value}("");
            require(ok, "Transfer to treasury failed");
        }
    }
}
