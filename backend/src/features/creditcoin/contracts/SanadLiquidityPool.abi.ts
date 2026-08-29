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

  // Proven Cross-Chain Investor Capital & Credit Ledger (Cr3dX Separation)
  "function investorTotalProvenCapital(address investor) external view returns (uint256)",
  "function totalCrossChainProvenCapital() external view returns (uint256)",
  "function getInvestorProvenDeposits(address investor) external view returns (tuple(uint64 chainKey, bytes32 sourceTxHash, uint256 amount, uint256 timestamp)[])",
  "function getInvestorCreditProfile(address investor) external view returns (uint256 withdrawableLpBalance, uint256 provenCrossChainCapital, uint256 provenDepositCount)",

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
  "function setGracePeriod(uint256 _gracePeriod) external",
  "function repaymentGatewayAddress() external view returns (address)",
  "function setRepaymentGatewayAddress(address _repaymentGateway) external",
  "event RepaymentGatewayUpdated(address indexed oldGateway, address indexed newGateway)",
  "function investorVaultAddress() external view returns (address)",
  "function setInvestorVaultAddress(address _investorVault) external",
  "event InvestorVaultUpdated(address indexed oldVault, address indexed newVault)",
  "function verifyAndRecordDeposit(uint64 chainKey, uint64 headerNumber, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) continuityProof, bytes32 sourceTxHash, uint256 claimedAmount) external returns (bool)",
  "event CrossChainDepositVerified(address indexed investor, uint64 indexed chainKey, bytes32 indexed sourceTxHash, uint256 amount, uint256 totalProvenCapital, uint256 timestamp)"
] as const;
