export const SANAD_CREDIT_ORACLE_ADDRESS =
  process.env.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS ||
  '0x69E427dA9D4Fe741a9341e65a5e3DB6C5ae18eb5';

export const CREDITCOIN_CHAIN_ID = 102031;
export const CREDITCOIN_RPC_URL = 'https://rpc.cc3-testnet.creditcoin.network';
export const CREDITCOIN_EXPLORER_URL = 'https://creditcoin-testnet.blockscout.com';

export const ATTESTCOIN_PRECOMPILES = {
  BLOCK_PROVER: '0x0000000000000000000000000000000000000FD2',
  CHAIN_INFO: '0x0000000000000000000000000000000000000fD3',
};

export const SANAD_CREDIT_ORACLE_ABI = [
  'function submitSingleProof(uint64 chainKey, uint64 height, bytes calldata encodedTransaction, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings) calldata merkleProof, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) calldata continuityProof, address borrower, tuple(bytes32 sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp) calldata eventData, bytes calldata borrowerSignature) external returns (bool)',
  'function submitBatchProof(uint64 chainKey, uint64[] calldata heights, bytes[] calldata encodedTransactions, tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings)[] calldata merkleProofs, tuple(bytes32 lowerEndpointDigest, bytes32[] roots) calldata sharedContinuityProof, address borrower, tuple(bytes32 sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp)[] calldata eventsData, bytes calldata borrowerSignature) external returns (bool)',
  'function getCreditProfile(address borrower) external view returns (tuple(address borrower, uint256 score, uint8 tier, uint256 totalRepaidUSD, uint256 totalLiquidatedUSD, uint256 totalDefaultedUSD, uint32 cleanRepaymentCount, uint32 liquidationCount, uint32 defaultCount, uint64 lastEvaluatedTimestamp, uint32 provenEventsCount))',
  'function getProvenEvents(address borrower) external view returns (tuple(bytes32 sourceTxHash, uint64 blockHeight, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 timestamp)[])',
  'function isTxProven(bytes32 txHash) external view returns (bool)',
  'function primarySourceChainKey() external view returns (uint64)',
  'event CreditScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore, uint8 tier, bytes32 indexed txHash)',
  'event DeFiEventProven(address indexed borrower, bytes32 indexed sourceTxHash, uint8 protocol, uint8 eventType, uint256 volumeUSD, uint64 blockHeight)'
] as const;
