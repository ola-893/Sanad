import { ethers } from 'ethers';
import { CreditcoinClient } from './creditcoin.client.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { SAG_TOKEN_ABI } from './contracts/SAGToken.abi.js';
import { SANAD_LIQUIDITY_POOL_ABI } from './contracts/SanadLiquidityPool.abi.js';
import { getSocketService } from '../../services/socket.service.js';
import { db } from '../../db/index.js';
import { CreditcoinAuditLogModel } from './creditcoin-audit.model.js';
import { desc, eq } from 'drizzle-orm';

export interface AuditLogEntry {
  id: string;
  eventType: 
    | 'COLLATERAL_MINTED' 
    | 'REPAYMENT_VERIFIED' 
    | 'LOAN_FUNDED' 
    | 'COLLATERAL_UNLOCKED'
    | 'TOKEN_FROZEN'
    | 'TOKEN_UNFROZEN'
    | 'ADDRESS_FROZEN'
    | 'ADDRESS_UNFROZEN'
    | 'TOKEN_WIPED'
    | 'DEFAULT_GRACE_ENTERED'
    | 'LIQUIDATION_AUCTION_STARTED'
    | 'COLLATERAL_LIQUIDATED'
    | 'SURPLUS_RETURNED_TO_BORROWER'
    | 'SHORTFALL_DISTRIBUTED_TO_POOL';
  tokenId: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
  details: any;
}

export class CreditcoinIndexerService {
  private client: CreditcoinClient;
  private memoryAuditLogs: AuditLogEntry[] = [];
  private isListening: boolean = false;

  constructor() {
    this.client = CreditcoinClient.getInstance();
  }

  public startListening() {
    if (this.isListening) return;
    
    try {
      const provider = this.client.getCreditcoinProvider();
      const sagAddress = CREDITCOIN_CONFIG.contracts.sagTokenAddress;
      const poolAddress = CREDITCOIN_CONFIG.contracts.liquidityPoolAddress;

      console.log('[Indexer] Initializing Creditcoin EVM event indexer on CC3 Testnet...');

      if (sagAddress && sagAddress !== ethers.ZeroAddress) {
        const sagContract = new ethers.Contract(sagAddress, SAG_TOKEN_ABI, provider);
        
        // 1. Collateral Minted
        sagContract.on('GoldCollateralMinted', async (tokenId, pawnshop, borrower, weightGrams, karat, appraisedValueUSD, loanAmount, ipfsUri, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-${Date.now()}-${tokenId}`,
            eventType: 'COLLATERAL_MINTED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              pawnshop,
              borrower,
              weightGrams: Number(weightGrams) / 100,
              karat: Number(karat),
              appraisedValueUSD: ethers.formatUnits(appraisedValueUSD, 6),
              loanAmount: ethers.formatUnits(loanAmount, 6),
              ipfsMetadataUri: ipfsUri,
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted GoldCollateralMinted: Token #${tokenId} in tx ${event.log.transactionHash}`);
          this.emitSocketEvent(logEntry);
        });

        // 2. Token Frozen
        sagContract.on('TokenFrozen', async (tokenId, by, reason, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-freeze-token-${Date.now()}-${tokenId}`,
            eventType: 'TOKEN_FROZEN',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: { by, reason, action: 'FREEZE_TOKEN' },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted TokenFrozen: Token #${tokenId} by ${by} (Reason: ${reason})`);
          this.emitSocketEvent(logEntry);
        });

        // 3. Token Unfrozen
        sagContract.on('TokenUnfrozen', async (tokenId, by, reason, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-unfreeze-token-${Date.now()}-${tokenId}`,
            eventType: 'TOKEN_UNFROZEN',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: { by, reason, action: 'UNFREEZE_TOKEN' },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted TokenUnfrozen: Token #${tokenId} by ${by}`);
          this.emitSocketEvent(logEntry);
        });

        // 4. Address Frozen
        sagContract.on('AddressFrozen', async (account, by, reason, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-freeze-addr-${Date.now()}-${account}`,
            eventType: 'ADDRESS_FROZEN',
            tokenId: '',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: { account, by, reason, action: 'FREEZE_ADDRESS' },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted AddressFrozen: Address ${account} by ${by}`);
          this.emitSocketEvent(logEntry);
        });

        // 5. Address Unfrozen
        sagContract.on('AddressUnfrozen', async (account, by, reason, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-unfreeze-addr-${Date.now()}-${account}`,
            eventType: 'ADDRESS_UNFROZEN',
            tokenId: '',
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: { account, by, reason, action: 'UNFREEZE_ADDRESS' },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted AddressUnfrozen: Address ${account} by ${by}`);
          this.emitSocketEvent(logEntry);
        });

        // 6. Token Wiped
        sagContract.on('TokenWiped', async (tokenId, from, by, reason, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-wipe-${Date.now()}-${tokenId}`,
            eventType: 'TOKEN_WIPED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: { from, by, reason, action: 'ADMIN_WIPE' },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, sagAddress);
          console.log(`[Indexer] Indexed & Persisted TokenWiped: Token #${tokenId} seized from ${from} by ${by}`);
          this.emitSocketEvent(logEntry);
        });
      }

      if (poolAddress && poolAddress !== ethers.ZeroAddress) {
        const poolContract = new ethers.Contract(poolAddress, SANAD_LIQUIDITY_POOL_ABI, provider);

        poolContract.on('CrossChainRepaymentVerified', async (tokenId, chainKey, sourceTxHash, amountUSD, verifiedAt, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-${Date.now()}-${tokenId}`,
            eventType: 'REPAYMENT_VERIFIED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              chainKey: Number(chainKey),
              sourceTxHash,
              amountUSD: ethers.formatUnits(amountUSD, 6),
              verifiedAt: Number(verifiedAt),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed & Persisted CrossChainRepaymentVerified: Token #${tokenId} in tx ${event.log.transactionHash}`);
          this.emitSocketEvent(logEntry);
        });

        poolContract.on('CollateralUnlocked', async (tokenId, pawnshop, unlockedAt, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-${Date.now()}-${tokenId}`,
            eventType: 'COLLATERAL_UNLOCKED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              pawnshop,
              unlockedAt: Number(unlockedAt),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed & Persisted CollateralUnlocked: Token #${tokenId}`);
          this.emitSocketEvent(logEntry);
        });

        // 7. Liquidation Auction Started
        poolContract.on('LiquidationAuctionStarted', async (tokenId, startPriceUSD, reservePriceUSD, auctionEndTime, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-liq-start-${Date.now()}-${tokenId}`,
            eventType: 'LIQUIDATION_AUCTION_STARTED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              startPriceUSD: ethers.formatUnits(startPriceUSD, 6),
              reservePriceUSD: ethers.formatUnits(reservePriceUSD, 6),
              auctionEndTime: Number(auctionEndTime),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed LiquidationAuctionStarted: Token #${tokenId}`);
          this.emitSocketEvent(logEntry);
        });

        // 8. Collateral Liquidated
        poolContract.on('CollateralLiquidated', async (tokenId, buyer, salePriceUSD, principalRepaid, ujrahFeePaid, surplusToBorrower, shortfallToPool, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-liq-sold-${Date.now()}-${tokenId}`,
            eventType: 'COLLATERAL_LIQUIDATED',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              buyer,
              salePriceUSD: ethers.formatUnits(salePriceUSD, 6),
              principalRepaid: ethers.formatUnits(principalRepaid, 6),
              ujrahFeePaid: ethers.formatUnits(ujrahFeePaid, 6),
              surplusToBorrower: ethers.formatUnits(surplusToBorrower, 6),
              shortfallToPool: ethers.formatUnits(shortfallToPool, 6),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed CollateralLiquidated: Token #${tokenId} sold for $${ethers.formatUnits(salePriceUSD, 6)}`);
          this.emitSocketEvent(logEntry);
        });

        // 9. Surplus Returned to Borrower
        poolContract.on('SurplusReturnedToBorrower', async (tokenId, borrower, amountUSD, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-surplus-${Date.now()}-${tokenId}`,
            eventType: 'SURPLUS_RETURNED_TO_BORROWER',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              borrower,
              amountUSD: ethers.formatUnits(amountUSD, 6),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed SurplusReturnedToBorrower: $${ethers.formatUnits(amountUSD, 6)} returned to ${borrower}`);
          this.emitSocketEvent(logEntry);
        });

        // 10. Shortfall Distributed to Pool
        poolContract.on('ShortfallDistributedToPool', async (tokenId, shortfallUSD, newTotalLiquidity, event) => {
          const logEntry: AuditLogEntry = {
            id: `audit-shortfall-${Date.now()}-${tokenId}`,
            eventType: 'SHORTFALL_DISTRIBUTED_TO_POOL',
            tokenId: tokenId.toString(),
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: new Date().toISOString(),
            details: {
              shortfallUSD: ethers.formatUnits(shortfallUSD, 6),
              newTotalLiquidity: ethers.formatUnits(newTotalLiquidity, 6),
            },
          };

          this.memoryAuditLogs.unshift(logEntry);
          await this.persistToDb(logEntry, poolAddress);
          console.log(`[Indexer] Indexed ShortfallDistributedToPool: $${ethers.formatUnits(shortfallUSD, 6)} absorbed by pool`);
          this.emitSocketEvent(logEntry);
        });
      }

      this.isListening = true;
      console.log('[Indexer] Creditcoin CC3 Event Indexer active and listening for compliance, default & liquidation events.');
    } catch (error) {
      console.error('[Indexer] Failed to initialize event listeners:', error);
    }
  }

  private async persistToDb(entry: AuditLogEntry, contractAddress: string) {
    try {
      await db.insert(CreditcoinAuditLogModel).values({
        eventType: entry.eventType,
        contractAddress: contractAddress,
        transactionHash: entry.transactionHash,
        blockNumber: entry.blockNumber,
        tokenId: entry.tokenId || null,
        details: entry.details,
        timestamp: new Date(entry.timestamp),
      });
    } catch (dbErr) {
      console.error('[Indexer] Failed to persist audit log entry to database:', dbErr);
    }
  }

  private emitSocketEvent(logEntry: AuditLogEntry) {
    try {
      const socketService = getSocketService();
      if (socketService?.io) {
        socketService.io.emit('creditcoin:audit_event', logEntry);
      }
    } catch (err) {
      // Socket might not be initialized in standalone scripts
    }
  }

  public async getAuditLogs(tokenId?: string): Promise<AuditLogEntry[]> {
    try {
      const query = db.select().from(CreditcoinAuditLogModel).orderBy(desc(CreditcoinAuditLogModel.timestamp)).limit(100);
      const rows = tokenId 
        ? await query.where(eq(CreditcoinAuditLogModel.tokenId, tokenId)) 
        : await query;

      if (rows && rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          eventType: r.eventType as any,
          tokenId: r.tokenId || '',
          blockNumber: r.blockNumber,
          transactionHash: r.transactionHash,
          timestamp: r.timestamp.toISOString(),
          details: r.details,
        }));
      }
    } catch (dbErr) {
      console.warn('[Indexer] DB query failed, falling back to memory audit logs:', dbErr);
    }

    if (tokenId) {
      return this.memoryAuditLogs.filter(log => log.tokenId === tokenId);
    }
    return this.memoryAuditLogs;
  }
}
