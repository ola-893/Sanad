// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SAGToken (Sanad Asset-backed Gold)
 * @notice ERC-721 Token representing physical gold pawn collateral notes on Creditcoin 3 (CC3).
 * @dev Replaces Hedera Token Service (HTS) native compliance features (freeze/unfreeze/wipe)
 *      with on-chain AccessControl role-gated controls and OpenZeppelin v5 transfer hooks.
 */
contract SAGToken is ERC721, AccessControl {
    // Segregated Roles for Compliance & Operations
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

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
        uint256 originationTimestamp; // Timestamp when loan was minted/originated
        uint256 maturityTimestamp; // Loan due date timestamp (originationTimestamp + tenure)
        uint256 monthlyUjrahUSD;   // Fixed monthly safekeeping/custody fee (scaled 6 decimals)
        string ipfsMetadataUri;    // Physical vault custody receipt & certification URI
    }

    struct MintParams {
        address pawnshop;
        address borrower;
        uint256 weightGrams;
        uint8 karat;
        uint256 appraisedValueUSD;
        uint256 loanAmount;
        uint256 tenureDays;
        uint256 monthlyUjrahUSD;
        string ipfsUri;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => GoldCollateral) public collaterals;
    mapping(uint256 => string) private _tokenURIs;

    // Compliance Freeze Mappings (Replacing Hedera per-account-per-token freeze)
    mapping(uint256 => bool) public frozenToken;      // Freezes specific loan/pledge
    mapping(address => bool) public frozenAddress;    // Freezes specific account/identity

    // Audit Events
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

    // Compliance Audit Events (replacing Hedera HCS compliance topics)
    event TokenFrozen(uint256 indexed tokenId, address indexed by, string reason);
    event TokenUnfrozen(uint256 indexed tokenId, address indexed by, string reason);
    event AddressFrozen(address indexed account, address indexed by, string reason);
    event AddressUnfrozen(address indexed account, address indexed by, string reason);
    event TokenWiped(uint256 indexed tokenId, address indexed from, address indexed by, string reason);

    constructor() ERC721("Sanad Asset-backed Gold", "SAG") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(SETTLEMENT_ROLE, msg.sender);
    }

    // =========================================================================
    // COMPLIANCE ACTIONS (COMPLIANCE_ROLE)
    // =========================================================================

    /**
     * @notice Freezes an individual collateral token (e.g. active loan dispute)
     */
    function freezeToken(uint256 tokenId, string calldata reason) external onlyRole(COMPLIANCE_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(!frozenToken[tokenId], "Token is already frozen");
        frozenToken[tokenId] = true;
        emit TokenFrozen(tokenId, msg.sender, reason);
    }

    /**
     * @notice Unfreezes an individual collateral token
     */
    function unfreezeToken(uint256 tokenId, string calldata reason) external onlyRole(COMPLIANCE_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(frozenToken[tokenId], "Token is not frozen");
        frozenToken[tokenId] = false;
        emit TokenUnfrozen(tokenId, msg.sender, reason);
    }

    /**
     * @notice Freezes an address across all tokens (e.g. AML/sanction flag)
     */
    function freezeAddress(address account, string calldata reason) external onlyRole(COMPLIANCE_ROLE) {
        require(account != address(0), "Cannot freeze zero address");
        require(!frozenAddress[account], "Address is already frozen");
        frozenAddress[account] = true;
        emit AddressFrozen(account, msg.sender, reason);
    }

    /**
     * @notice Unfreezes a previously frozen address
     */
    function unfreezeAddress(address account, string calldata reason) external onlyRole(COMPLIANCE_ROLE) {
        require(account != address(0), "Cannot unfreeze zero address");
        require(frozenAddress[account], "Address is not frozen");
        frozenAddress[account] = false;
        emit AddressUnfrozen(account, msg.sender, reason);
    }

    /**
     * @notice Forced administrative burn/wipe ignoring ownership (e.g. court order / civil forfeiture)
     * @dev Wiping supersedes commercial loan state: if tainted/fraudulent collateral is ordered seized,
     *      compliance burns the NFT immediately without waiting for borrower repayment.
     */
    function adminWipe(uint256 tokenId, string calldata reason) external onlyRole(COMPLIANCE_ROLE) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");

        // Clear freeze flag if set so state remains consistent
        frozenToken[tokenId] = false;
        collaterals[tokenId].status = CollateralStatus.Liquidated;

        emit TokenWiped(tokenId, owner, msg.sender, reason);

        // Forced burn via ERC721 internal _burn
        _burn(tokenId);
    }

    // =========================================================================
    // ORIGINATION & MINTING ACTIONS (MINTER_ROLE)
    // =========================================================================

    /**
     * @notice Mints a new SAG NFT representing physical gold collateral
     */
    function mintCollateral(MintParams calldata p) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(p.pawnshop != address(0), "Invalid pawnshop address");
        require(p.borrower != address(0), "Invalid borrower address");
        require(!frozenAddress[p.pawnshop], "Compliance: Pawnshop address is frozen");
        require(!frozenAddress[p.borrower], "Compliance: Borrower address is frozen");
        require(p.weightGrams > 0, "Weight must be greater than 0");
        require(p.appraisedValueUSD > 0, "Valuation must be greater than 0");

        uint256 effectiveTenure = p.tenureDays > 0 ? p.tenureDays : 30;
        uint256 maturity = block.timestamp + (effectiveTenure * 1 days);

        uint256 tokenId = ++_nextTokenId;
        _safeMint(p.pawnshop, tokenId);
        _tokenURIs[tokenId] = p.ipfsUri;

        uint256 ltv = (p.loanAmount * 10000) / p.appraisedValueUSD;

        collaterals[tokenId] = GoldCollateral({
            weightGrams: p.weightGrams,
            karat: p.karat,
            appraisedValueUSD: p.appraisedValueUSD,
            loanAmount: p.loanAmount,
            ltvBps: ltv,
            pawnshop: p.pawnshop,
            borrower: p.borrower,
            status: CollateralStatus.ActivePledged,
            originationTimestamp: block.timestamp,
            maturityTimestamp: maturity,
            monthlyUjrahUSD: p.monthlyUjrahUSD,
            ipfsMetadataUri: p.ipfsUri
        });

        emit GoldCollateralMinted(
            tokenId,
            p.pawnshop,
            p.borrower,
            p.weightGrams,
            p.karat,
            p.appraisedValueUSD,
            p.loanAmount,
            p.ipfsUri
        );

        return tokenId;
    }

    // =========================================================================
    // SETTLEMENT & LIFECYCLE ACTIONS (SETTLEMENT_ROLE)
    // =========================================================================

    /**
     * @notice Updates the status of a collateral token
     */
    function setStatus(uint256 tokenId, CollateralStatus status) external onlyRole(SETTLEMENT_ROLE) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");
        require(!frozenToken[tokenId], "Compliance: Token is frozen");
        require(!frozenAddress[owner], "Compliance: Owner address is frozen");

        collaterals[tokenId].status = status;
        emit CollateralStatusUpdated(tokenId, status);
    }

    /**
     * @notice Marks a collateral loan as settled/repaid upon verified proof
     */
    function settleLoan(uint256 tokenId) external onlyRole(SETTLEMENT_ROLE) {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Token does not exist");
        require(!frozenToken[tokenId], "Compliance: Token is frozen");
        require(!frozenAddress[owner], "Compliance: Owner address is frozen");

        collaterals[tokenId].status = CollateralStatus.Repaid;
        emit CollateralStatusUpdated(tokenId, CollateralStatus.Repaid);
    }

    // =========================================================================
    // OPENZEPPELIN V5 TRANSFER HOOK OVERRIDE
    // =========================================================================

    /**
     * @dev Overrides OpenZeppelin v5 ERC721 _update hook to enforce token and address compliance.
     *      In OZ v5, _update handles minting (from=0), burning (to=0), and transfers.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // 1. Recipient check: if not burning, recipient address cannot be frozen
        if (to != address(0)) {
            require(!frozenAddress[to], "Compliance: Recipient address is frozen");
        }

        // 2. Transfer check: if existing token is being transferred (not minted and not admin wiped)
        if (from != address(0)) {
            if (to != address(0)) {
                require(!frozenToken[tokenId], "Compliance: Token is frozen");
                require(!frozenAddress[from], "Compliance: Sender address is frozen");
            }
        }

        return super._update(to, tokenId, auth);
    }

    // =========================================================================
    // VIEW / UTILITY FUNCTIONS
    // =========================================================================

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

    /**
     * @dev SupportsInterface required for multiple inheritance (ERC721 + AccessControl)
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
