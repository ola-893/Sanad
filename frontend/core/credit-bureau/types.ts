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

export enum EventType {
  CleanRepayment = 0,
  OvercollateralizedLiquidation = 1,
  UndercollateralizedDefault = 2,
  CollateralSupply = 3,
  ActiveBorrowPosition = 4,
}

export const EVENT_TYPE_NAMES: Record<EventType, string> = {
  [EventType.CleanRepayment]: 'Clean Repayment',
  [EventType.OvercollateralizedLiquidation]: 'Liquidation Call',
  [EventType.UndercollateralizedDefault]: 'Undercollateralized Default',
  [EventType.CollateralSupply]: 'Collateral Supply',
  [EventType.ActiveBorrowPosition]: 'Active Borrow Position',
};

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

export interface AddressSecurityInfo {
  isFlagged: boolean;
  label?: string;
  category?: 'Exploit' | 'Sanctioned' | 'Phishing' | 'HighRisk' | 'Clean';
  riskWarning?: string;
  source: string;
}

export interface DiscoverySummary {
  cleanRepaymentsCount: number;
  activeBorrowsCount?: number;
  liquidationsCount: number;
  defaultsCount: number;
  totalVolumeUSD: number;
  totalRepaidUSD?: number;
  totalBorrowedUSD?: number;
  estimatedTier: string;
  activeProtocolsCount?: number;
  securityInfo?: AddressSecurityInfo;
}

export interface OnChainCreditProfile {
  borrower: string;
  score: number;
  tier: string;
  totalRepaidUSD: string;
  totalLiquidatedUSD: string;
  totalDefaultedUSD: string;
  totalBorrowedUSD?: string;
  cleanRepaymentCount: number;
  liquidationCount: number;
  defaultCount: number;
  activeBorrowCount?: number;
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
