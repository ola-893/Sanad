export const SANAD_LIQUIDITY_POOL_ABI = [
  "constructor(address _sagToken, address _liquidityToken)",
  "event LoanFunded(uint256 indexed tokenId, address indexed pawnshop, uint256 amount)",
  "event CrossChainRepaymentVerified(uint256 indexed tokenId, uint64 chainKey, bytes32 indexed sourceTxHash, uint256 amount)",
  "event CollateralUnlocked(uint256 indexed tokenId, address indexed pawnshop, uint256 timestamp)",
  "event LiquidityDeposited(address indexed investor, uint256 amount)",

  "function BLOCK_PROVER_PRECOMPILE() external view returns (address)",
  "function sagToken() external view returns (address)",
  "function liquidityCurrency() external view returns (address)",
  "function verifyAndSettleRepayment(uint256 tokenId, uint64 chainKey, uint64 headerNumber, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) calldata merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) calldata continuityProof, bytes32 sourceTxHash, uint256 repaidAmountUSD) external returns (bool)",
  "function processedSourceTransactions(bytes32 sourceTxHash) external view returns (bool)",
  "function tokenLoanBalance(uint256 tokenId) external view returns (uint256)",
  "function fundLoan(uint256 tokenId, uint256 amount) external"
] as const;

// Backward compatibility alias
export const SILSILAT_LIQUIDITY_POOL_ABI = SANAD_LIQUIDITY_POOL_ABI;

export const REPAYMENT_GATEWAY_ABI = [
  "constructor(address _acceptedPaymentToken, address _treasury)",
  "event InvoiceRepaymentReceived(uint256 indexed tokenId, address indexed payer, uint256 amount, uint256 timestamp)",
  "function repayInvoice(uint256 tokenId, uint256 amount) external",
  "function acceptedPaymentToken() external view returns (address)",
  "function treasury() external view returns (address)",
  "function setTreasury(address _treasury) external"
] as const;
