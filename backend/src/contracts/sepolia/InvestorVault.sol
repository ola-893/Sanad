// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InvestorVault
 * @notice Sepolia Gateway contract for cross-chain liquidity provision and peer-to-peer loan funding into Sanad on Creditcoin CC3.
 *         Investors call fundLoan(uint256 tokenId, address borrower) on Ethereum Sepolia, which is cryptographically proven
 *         on Creditcoin CC3 via the Attestcoin BlockProver precompile.
 */
contract InvestorVault {
    address public owner;
    address public treasury;

    // Mapping of loan tokenId -> investor funder address
    mapping(uint256 => address) public loanFunders;

    event DepositMade(address indexed investor, uint256 amount, uint256 timestamp);
    event LoanFunded(
        uint256 indexed tokenId,
        address indexed investor,
        address indexed borrower,
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
     * @notice Fund a specific loan directly on Sepolia (Peer-to-Peer Cross-Chain Funding).
     * @dev Function selector is 0x6d1611c4 (fundLoan(uint256,address)).
     *      Immediately forwards msg.value directly to borrower.
     *      Records loanFunders[tokenId] on Sepolia before the transfer for direct repayment routing.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param borrower Borrower / pawnshop recipient address on Sepolia
     */
    function fundLoan(uint256 tokenId, address borrower) external payable {
        require(tokenId > 0, "Invalid token ID");
        require(borrower != address(0), "Invalid borrower address");
        require(msg.value > 0, "Funding amount must be greater than zero");
        require(loanFunders[tokenId] == address(0), "Loan already funded");

        // Record loan funder before transfer (Checks-Effects-Interactions)
        loanFunders[tokenId] = msg.sender;

        (bool ok, ) = borrower.call{value: msg.value}("");
        require(ok, "Forward to borrower failed");

        emit LoanFunded(tokenId, msg.sender, borrower, msg.value, block.timestamp);
    }

    /**
     * @notice Deposit native ETH funds for general LP provisioning on Creditcoin CC3.
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
