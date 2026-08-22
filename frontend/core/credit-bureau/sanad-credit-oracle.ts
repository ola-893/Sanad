import { Protocol, ProtocolMeta } from './types';

export const SANAD_CREDIT_ORACLE_ADDRESS =
  process.env.NEXT_PUBLIC_SANAD_CREDIT_ORACLE_ADDRESS || '0x59577E83E0b038bd3ad224b8Ae5E16f5E2819AD3';

export const CREDITCOIN_CHAIN_ID = 102031;
export const CREDITCOIN_RPC_URL = 'https://rpc.cc3-testnet.creditcoin.network';
export const CREDITCOIN_EXPLORER_URL = 'https://creditcoin-testnet.blockscout.com';

export const ATTESTCOIN_PRECOMPILES = {
  BLOCK_PROVER: '0x0000000000000000000000000000000000000FD2',
  CHAIN_INFO: '0x0000000000000000000000000000000000000fD3',
};

// 10 Major Ethereum Mainnet Lending Protocols
export const SUPPORTED_ETHEREUM_PROTOCOLS: ProtocolMeta[] = [
  {
    id: Protocol.AaveV3,
    name: 'Aave v3',
    category: 'Pooled Lending',
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    badgeColor: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    iconName: 'Aave',
  },
  {
    id: Protocol.CompoundV3,
    name: 'Compound v3',
    category: 'Pooled Lending',
    address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    iconName: 'Compound',
  },
  {
    id: Protocol.MorphoBlue,
    name: 'Morpho Blue',
    category: 'Modular Primitive',
    address: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    iconName: 'Morpho',
  },
  {
    id: Protocol.SparkProtocol,
    name: 'Spark Protocol (Sky)',
    category: 'DAI/USDS Lending',
    address: '0xC13e21B648A5Ee794902342038FF3aDAB66BE987',
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    iconName: 'Spark',
  },
  {
    id: Protocol.MakerDAO,
    name: 'MakerDAO (Sky CDP)',
    category: 'CDP Vaults',
    address: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    iconName: 'Maker',
  },
  {
    id: Protocol.EulerV2,
    name: 'Euler v2',
    category: 'Modular Vaults',
    address: '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383',
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    iconName: 'Euler',
  },
  {
    id: Protocol.Fluid,
    name: 'Fluid (Instadapp)',
    category: 'Smart Debt Layer',
    address: '0x52Aa899454998Be5b000Ad077a46Bbe360F4e497',
    badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    iconName: 'Fluid',
  },
  {
    id: Protocol.MapleFinance,
    name: 'Maple Finance',
    category: 'Institutional Credit',
    address: '0x9950eb7A27bE4fb75fEae9903b41E39B2efd492d',
    badgeColor: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    iconName: 'Maple',
  },
  {
    id: Protocol.Goldfinch,
    name: 'Goldfinch Protocol',
    category: 'RWA Credit Desks',
    address: '0x438645A201b1979B0075E81816f1c4EEea72Ebc1',
    badgeColor: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    iconName: 'Goldfinch',
  },
  {
    id: Protocol.Fraxlend,
    name: 'Fraxlend',
    category: 'Isolated Lending',
    address: '0x5D6E79bcF0E728d7AE0772D7d0769b8969796E62',
    badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    iconName: 'Frax',
  },
];

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
