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
}
