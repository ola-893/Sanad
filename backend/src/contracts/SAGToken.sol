// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SAGToken (Sanad Asset-backed Gold)
 * @notice ERC-721 Token representing physical gold pawn collateral notes on Creditcoin 3 (CC3).
 * @dev Replaces Hedera HTS Non-Fungible Token service.
 */
contract SAGToken is ERC721, Ownable {
    enum CollateralStatus { 
        PendingValuation, // 0
        ActivePledged,    // 1
        Repaid,           // 2
        Defaulted,        // 3
        Liquidated        // 4
    }

    struct GoldCollateral {
        uint256 weightGrams;       // Weight in grams with 2 decimals (e.g. 5050 = 50.50g)
        uint8 karat;               // Purity (18, 22, 24)
        uint256 appraisedValueUSD; // Scaled to 6 decimals (USDC equivalent)
        uint256 loanAmount;        // Borrowed principal amount
        uint256 ltvBps;            // Loan to value in basis points (e.g. 7000 = 70%)
        address pawnshop;          // Originating pawnshop address
        address borrower;          // Pledging borrower address
        CollateralStatus status;   // Current collateral status
        string ipfsMetadataUri;    // Physical vault custody receipt & certification URI
    }

    uint256 private _nextTokenId;
    mapping(uint256 => GoldCollateral) public collaterals;
    mapping(uint256 => string) private _tokenURIs;

    // Events replacing Hedera HCS Topic logging for decentralized auditing
    event GoldCollateralMinted(
        uint256 indexed tokenId,
        address indexed pawnshop,
        address indexed borrower,
        uint256 weightGrams,
        uint8 karat,
        uint256 appraisedValueUSD,
        uint256 loanAmount,
        string ipfsMetadataUri
    );

    event CollateralStatusUpdated(
        uint256 indexed tokenId,
        CollateralStatus newStatus
    );

    constructor() ERC721("Sanad Asset-backed Gold", "SAG") Ownable(msg.sender) {}

    /**
     * @notice Mints a new SAG NFT representing physical gold collateral
     */
    function mintCollateral(
        address pawnshop,
        address borrower,
        uint256 weightGrams,
        uint8 karat,
        uint256 appraisedValueUSD,
        uint256 loanAmount,
        string calldata ipfsUri
    ) external onlyOwner returns (uint256) {
        require(pawnshop != address(0), "Invalid pawnshop address");
        require(borrower != address(0), "Invalid borrower address");
        require(weightGrams > 0, "Weight must be greater than 0");
        require(appraisedValueUSD > 0, "Valuation must be greater than 0");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(pawnshop, tokenId);
        _tokenURIs[tokenId] = ipfsUri;

        uint256 ltv = (loanAmount * 10000) / appraisedValueUSD;

        collaterals[tokenId] = GoldCollateral({
            weightGrams: weightGrams,
            karat: karat,
            appraisedValueUSD: appraisedValueUSD,
            loanAmount: loanAmount,
            ltvBps: ltv,
            pawnshop: pawnshop,
            borrower: borrower,
            status: CollateralStatus.ActivePledged,
            ipfsMetadataUri: ipfsUri
        });

        emit GoldCollateralMinted(
            tokenId,
            pawnshop,
            borrower,
            weightGrams,
            karat,
            appraisedValueUSD,
            loanAmount,
            ipfsUri
        );

        return tokenId;
    }

    /**
     * @notice Updates the status of a collateral token
     */
    function setStatus(uint256 tokenId, CollateralStatus status) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        collaterals[tokenId].status = status;
        emit CollateralStatusUpdated(tokenId, status);
    }

    /**
     * @notice Marks a collateral loan as settled/repaid
     */
    function settleLoan(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        collaterals[tokenId].status = CollateralStatus.Repaid;
        emit CollateralStatusUpdated(tokenId, CollateralStatus.Repaid);
    }

    /**
     * @notice Retrieves full collateral details for a token
     */
    function getCollateral(uint256 tokenId) external view returns (GoldCollateral memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return collaterals[tokenId];
    }

    /**
     * @notice Returns token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
