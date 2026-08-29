// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IInvestorVault {
    function loanFunders(uint256 tokenId) external view returns (address);
}

/**
 * @title RepaymentGateway
 * @notice Ethereum Sepolia Gateway for cross-chain debt repayments of Sanad SAG loans on Creditcoin 3.
 * @dev Emits RepaymentMade events that are cryptographically verified on Creditcoin CC3
 *      via the native BlockProver precompile (0xFD2) and Attestcoin Protocol (chainKey: 1).
 *      Directly routes repayments to the specific funding investor if loan was peer-to-peer funded,
 *      otherwise routes to the general treasury.
 */
contract RepaymentGateway {
    address public owner;
    address public treasury;
    address public investorVaultAddress;

    // Total repayments tracked per loan token ID
    mapping(uint256 => uint256) public totalRepaidForToken;

    event RepaymentMade(
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 timestamp
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event InvestorVaultUpdated(address indexed oldVault, address indexed newVault);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _treasury, address _investorVault) {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : msg.sender;
        investorVaultAddress = _investorVault;
    }

    /**
     * @notice Repays an active Sanad loan for a specific SAG Token ID on Sepolia.
     * @dev Function selector is 0xd8aed145 (repay(uint256,uint256)).
     *      Strictly enforces that msg.value is greater than zero and matches amount unconditionally.
     *      Routes repayment directly to the loan funder if recorded in InvestorVault, else treasury.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param amount Amount repaid (must match msg.value in wei)
     */
    function repay(uint256 tokenId, uint256 amount) external payable {
        require(tokenId > 0, "Invalid token ID");
        require(amount > 0, "Repayment amount must be greater than zero");
        require(msg.value == amount, "msg.value does not match amount parameter");

        address destination = treasury;
        if (investorVaultAddress != address(0)) {
            address funder = IInvestorVault(investorVaultAddress).loanFunders(tokenId);
            if (funder != address(0)) {
                destination = funder;
            }
        }

        if (destination != address(this)) {
            (bool ok, ) = destination.call{value: msg.value}("");
            require(ok, "Transfer failed");
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
     * @notice Update InvestorVault destination address for loan funder lookups
     */
    function setInvestorVault(address _investorVault) external onlyOwner {
        emit InvestorVaultUpdated(investorVaultAddress, _investorVault);
        investorVaultAddress = _investorVault;
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
