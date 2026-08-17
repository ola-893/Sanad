export const SAG_TOKEN_ABI = [
  "constructor()",
  "event GoldCollateralMinted(uint256 indexed tokenId, address indexed pawnshop, address indexed borrower, uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, string ipfsMetadataUri)",
  "event CollateralStatusUpdated(uint256 indexed tokenId, uint8 newStatus)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  
  "function mintCollateral(address pawnshop, address borrower, uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, string calldata ipfsUri) external returns (uint256)",
  "function setStatus(uint256 tokenId, uint8 status) external",
  "function getCollateral(uint256 tokenId) external view returns (tuple(uint256 weightGrams, uint8 karat, uint256 appraisedValueUSD, uint256 loanAmount, uint256 ltvBps, address pawnshop, address borrower, uint8 status, string ipfsMetadataUri))",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)"
] as const;
