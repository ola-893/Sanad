export const SANAD_LIQUIDITY_POOL_ADDRESS =
  process.env.NEXT_PUBLIC_SANAD_LIQUIDITY_POOL_ADDRESS ||
  process.env.NEXT_PUBLIC_LIQUIDITY_POOL_ADDRESS ||
  '0xA2Ddf564f4F92A60cAD11AE95c49c25393D5e74F';

export const SAG_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_SAG_TOKEN_ADDRESS ||
  '0xF87125c68Ad8Af788f4c7C91151976c15C3aCf13';

export const SANAD_LIQUIDITY_POOL_ABI = [
  "constructor(address _sagToken)",

  // Events
  "event LiquidityDeposited(address indexed provider, uint256 amount, uint256 newTotalLiquidity)",
  "event LiquidityWithdrawn(address indexed provider, uint256 amount, uint256 newTotalLiquidity)",
  "event LoanFunded(uint256 indexed tokenId, address indexed pawnshop, uint256 amount)",
  "event CrossChainRepaymentVerified(uint256 indexed tokenId, uint64 indexed chainKey, bytes32 indexed sourceTxHash, uint256 amountUSD, uint256 timestamp)",
  "event CollateralUnlocked(uint256 indexed tokenId, address indexed pawnshop, uint256 timestamp)",
  "event LoanRepaid(uint256 indexed tokenId, address indexed payer, uint256 principalRepaid, uint256 ujrahFeePaid, uint256 timestamp)",
  "event DefaultGracePeriodEntered(uint256 indexed tokenId, uint256 maturityTimestamp, uint256 gracePeriodEnd)",
  "event LiquidationAuctionStarted(uint256 indexed tokenId, uint256 startPriceUSD, uint256 reservePriceUSD, uint256 auctionEndTime)",
  "event CollateralLiquidated(uint256 indexed tokenId, address indexed buyer, uint256 salePriceUSD, uint256 principalRepaid, uint256 ujrahFeePaid, uint256 surplusToBorrower, uint256 shortfallToPool)",
  "event SurplusReturnedToBorrower(uint256 indexed tokenId, address indexed borrower, uint256 amountUSD)",
  "event ShortfallDistributedToPool(uint256 indexed tokenId, uint256 shortfallUSD, uint256 newTotalLiquidity)",

  // LP Capital Accounting (Native CTC)
  "function depositLiquidity() external payable",
  "function withdrawLiquidity(uint256 amount) external",
  "function lpBalances(address provider) external view returns (uint256)",
  "function totalPoolLiquidity() external view returns (uint256)",

  // Loan Funding & Cross-Chain / Same-Chain Settlement
  "function fundLoan(uint256 tokenId, uint256 amount) external",
  "function repayLoanDirect(uint256 tokenId) external payable",
  "function verifyAndSettleRepayment(uint256 tokenId, uint64 chainKey, uint64 headerNumber, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, bytes32 sourceTxHash, uint256 repaidAmountUSD) external returns (bool)",
  "function calculateAccruedUjrah(uint256 tokenId) external view returns (uint256)",
  "function tokenLoanBalance(uint256 tokenId) external view returns (uint256)",
  "function processedSourceTransactions(bytes32 sourceTxHash) external view returns (bool)",

  // Default & Liquidation
  "function checkDefaultStatus(uint256 tokenId) external view returns (bool isDefaulted, bool isLiquidationEligible)",
  "function triggerLiquidation(uint256 tokenId) external",
  "function resetExpiredAuction(uint256 tokenId, uint256 discountedReservePriceUSD) external",
  "function getCurrentAuctionPrice(uint256 tokenId) external view returns (uint256)",
  "function buyLiquidatedCollateral(uint256 tokenId, uint256 maxPaymentUSD) external payable returns (uint256)",
  "function auctions(uint256 tokenId) external view returns (tuple(uint256 tokenId, uint256 startPriceUSD, uint256 reservePriceUSD, uint256 startTime, uint256 endTime, bool active))",
  "function gracePeriod() external view returns (uint256)",
  "function auctionDuration() external view returns (uint256)",
  "function setGracePeriod(uint256 _gracePeriod) external"
] as const;
