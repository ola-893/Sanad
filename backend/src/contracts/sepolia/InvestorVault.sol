// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InvestorVault
 * @notice Sepolia Gateway contract for cross-chain liquidity provision and peer-to-peer loan funding into Sanad on Creditcoin CC3.
 *         Investors call fundLoan(uint256 tokenId, address pawnshop, uint256 appraisedValueUSD) on Ethereum Sepolia, which
 *         forwards funds to the pawnshop and is cryptographically proven on Creditcoin CC3 via the Attestcoin BlockProver precompile.
 *         Pawnshops then call disburseLoan(uint256 tokenId, address borrower, uint256 amount) to forward funds to the borrower.
 */
contract InvestorVault {
    address public owner;
    address public treasury;

    // Mapping of loan tokenId -> investor funder address
    mapping(uint256 => address) public loanFunders;
    // Mapping of loan tokenId -> pawnshop recipient address
    mapping(uint256 => address) public loanPawnshops;
    // Mapping of loan tokenId -> stored USD appraisal valuation (audit trail)
    mapping(uint256 => uint256) public loanAppraisedValue;
    // Mapping of loan tokenId -> disbursement status
    mapping(uint256 => bool) public loanDisbursed;

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

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : msg.sender;
    }

    /**
     * @notice Fund a specific loan directly on Sepolia (Peer-to-Peer Cross-Chain Funding: Investor -> Pawnshop).
     * @dev Function selector is 0xfdc6f341 (fundLoan(uint256,address,uint256)).
     *      Immediately forwards msg.value directly to the pawnshop.
     *      Records loanFunders[tokenId], loanPawnshops[tokenId], and loanAppraisedValue[tokenId].
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param pawnshop Pawnshop recipient address on Sepolia
     * @param appraisedValueUSD USD-denominated appraisal valuation from SAGToken (audit trail)
     */
    function fundLoan(uint256 tokenId, address pawnshop, uint256 appraisedValueUSD) external payable {
        require(tokenId > 0, "Invalid token ID");
        require(pawnshop != address(0), "Invalid pawnshop address");
        require(msg.value > 0, "Funding amount must be greater than zero");
        require(loanFunders[tokenId] == address(0), "Loan already funded");

        // Record loan origination state before transfer (Checks-Effects-Interactions)
        loanFunders[tokenId] = msg.sender;
        loanPawnshops[tokenId] = pawnshop;
        loanAppraisedValue[tokenId] = appraisedValueUSD;

        (bool ok, ) = pawnshop.call{value: msg.value}("");
        require(ok, "Forward to pawnshop failed");

        emit LoanFunded(tokenId, msg.sender, pawnshop, msg.value, appraisedValueUSD, block.timestamp);
    }

    /**
     * @notice Disburse funded loan proceeds from the pawnshop to the end borrower (Pawnshop -> Borrower).
     * @dev Function selector is 0xff408ad3 (disburseLoan(uint256,address,uint256)).
     *      Immediately forwards msg.value directly to the borrower.
     *      Strictly enforces that only the assigned pawnshop can disburse, and prevents double disbursement.
     * @param tokenId SAG Token ID on Creditcoin CC3
     * @param borrower End borrower recipient address on Sepolia
     * @param amount Disbursement amount in wei (must match msg.value exactly)
     */
    function disburseLoan(uint256 tokenId, address borrower, uint256 amount) external payable {
        require(msg.sender == loanPawnshops[tokenId], "Only assigned pawnshop can disburse");
        require(borrower != address(0), "Invalid borrower address");
        require(amount > 0, "Disbursement amount must be greater than zero");
        require(msg.value == amount, "msg.value does not match amount parameter");
        require(!loanDisbursed[tokenId], "Loan already disbursed");

        loanDisbursed[tokenId] = true;

        (bool ok, ) = borrower.call{value: msg.value}("");
        require(ok, "Forward to borrower failed");

        emit LoanDisbursed(tokenId, msg.sender, borrower, amount, loanAppraisedValue[tokenId], block.timestamp);
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
