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
  eventType: 'COLLATERAL_MINTED' | 'REPAYMENT_VERIFIED' | 'LOAN_FUNDED' | 'COLLATERAL_UNLOCKED';
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

          // 1. In-memory cache
          this.memoryAuditLogs.unshift(logEntry);

          // 2. Persist to Postgres database
          await this.persistToDb(logEntry, sagAddress);

          console.log(`[Indexer] Indexed & Persisted GoldCollateralMinted: Token #${tokenId} in tx ${event.log.transactionHash}`);

          // 3. Broadcast real-time update via Socket.IO
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
      }

      this.isListening = true;
      console.log('[Indexer] Creditcoin CC3 Event Indexer active and listening.');
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
        tokenId: entry.tokenId,
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
      // Query persistent database logs first
      const query = db.select().from(CreditcoinAuditLogModel).orderBy(desc(CreditcoinAuditLogModel.timestamp)).limit(50);
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
