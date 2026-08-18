export const SAG_TOKEN_ABI = [
  "constructor()",
  
  // Core Events
  "event GoldCollateralMinted(uint256 indexed tokenId, address indexed pawnshop, address indexed borrower, uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, string ipfsMetadataUri)",
  "event CollateralStatusUpdated(uint256 indexed tokenId, uint8 newStatus)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",

  // Compliance Audit Events
  "event TokenFrozen(uint256 indexed tokenId, address indexed by, string reason)",
  "event TokenUnfrozen(uint256 indexed tokenId, address indexed by, string reason)",
  "event AddressFrozen(address indexed account, address indexed by, string reason)",
  "event AddressUnfrozen(address indexed account, address indexed by, string reason)",
  "event TokenWiped(uint256 indexed tokenId, address indexed from, address indexed by, string reason)",

  // Compliance Functions
  "function freezeToken(uint256 tokenId, string calldata reason) external",
  "function unfreezeToken(uint256 tokenId, string calldata reason) external",
  "function freezeAddress(address account, string calldata reason) external",
  "function unfreezeAddress(address account, string calldata reason) external",
  "function adminWipe(uint256 tokenId, string calldata reason) external",
  "function frozenToken(uint256 tokenId) external view returns (bool)",
  "function frozenAddress(address account) external view returns (bool)",

  // Core Minting & Loan Actions
  "function mintCollateral(tuple(address pawnshop, address borrower, uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, uint256 tenureDays, uint256 monthlyUjrahUSD, string ipfsUri) p) external returns (uint256)",
  "function setStatus(uint256 tokenId, uint8 status) external",
  "function settleLoan(uint256 tokenId) external",
  "function getCollateral(uint256 tokenId) external view returns (tuple(uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, uint256 ltvBps, address pawnshop, address borrower, uint8 status, uint256 maturityTimestamp, uint256 monthlyUjrahUSD, string ipfsMetadataUri))",
  
  // AccessControl Functions
  "function COMPLIANCE_ROLE() external view returns (bytes32)",
  "function MINTER_ROLE() external view returns (bytes32)",
  "function SETTLEMENT_ROLE() external view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",

  // ERC721 Standard Functions
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external"
] as const;
