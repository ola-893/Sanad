export enum Protocol {
  AaveV3 = 0,
  CompoundV3 = 1,
  MorphoBlue = 2,
  SparkProtocol = 3,
  MakerDAO = 4,
  EulerV2 = 5,
  Fluid = 6,
  MapleFinance = 7,
  Goldfinch = 8,
  Fraxlend = 9,
}

export interface DeFiEvent {
  sourceTxHash: string;
  blockHeight: number;
  protocol: number;
  protocolName: string;
  eventType: number;
  eventTypeName: string;
  volumeUSD: number;
  timestamp: number;
  description: string;
  weightScore: number;
  etherscanUrl: string;
}

export interface DiscoverySummary {
  cleanRepaymentsCount: number;
  liquidationsCount: number;
  defaultsCount: number;
  totalVolumeUSD: number;
  estimatedTier: string;
  activeProtocolsCount?: number;
}

export interface OnChainCreditProfile {
  borrower: string;
  score: number;
  tier: string;
  totalRepaidUSD: string;
  totalLiquidatedUSD: string;
  totalDefaultedUSD: string;
  cleanRepaymentCount: number;
  liquidationCount: number;
  defaultCount: number;
  provenEventsCount: number;
  lastEvaluatedTimestamp: number;
  provenEvents: any[];
}

export interface BorrowerPreset {
  id: string;
  label: string;
  address: string;
  tag: string;
  desc: string;
  targetScore: number;
  targetTier: string;
  protocols: string[];
}

export interface ProtocolMeta {
  id: Protocol;
  name: string;
  category: string;
  address: string;
  badgeColor: string;
  iconName: string;
}
