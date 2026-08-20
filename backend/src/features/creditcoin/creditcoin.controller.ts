import { Request, Response } from 'express';
import { CreditcoinClient } from './creditcoin.client.js';
import { SagTokenService, MintSagParams } from './sag-token.service.js';
import { CreditcoinIndexerService } from './creditcoin-indexer.service.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { KycService } from '../kyc/kyc.service.js';
import { User } from '../auth/auth.model.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

const sagService = new SagTokenService();
const indexerService = new CreditcoinIndexerService();
const kycService = new KycService();

// Start event listening
indexerService.startListening();

export class CreditcoinController {
  /**
   * GET /api/v1/creditcoin/status
   */
  public async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const client = CreditcoinClient.getInstance();
      const status = await client.getNetworkStatus();
      res.status(200).json({
        success: true,
        network: status,
        config: {
          chainName: CREDITCOIN_CONFIG.chainName,
          rpcUrl: CREDITCOIN_CONFIG.rpcUrl,
          chainId: CREDITCOIN_CONFIG.chainId,
          contracts: CREDITCOIN_CONFIG.contracts,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/collateral/mint
   */
  public async mintCollateral(req: Request, res: Response): Promise<void> {
    try {
      const { pawnshopAddress, borrowerAddress, weightGrams, karat, appraisedValueUSD, loanAmount, ipfsMetadataUri } = req.body;

      if (!pawnshopAddress || !borrowerAddress || !weightGrams || !karat || !appraisedValueUSD || !loanAmount) {
        res.status(400).json({ success: false, error: 'Missing required collateral parameters' });
        return;
      }

      // 1. Check authenticated user KYC if available
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await getUserDataByToken(token);
        if (user && user.userId) {
          const kycCheck = await kycService.isUserApproved(user.userId);
          if (!kycCheck.approved) {
            res.status(403).json({
              success: false,
              error: 'KYC_NOT_APPROVED',
              kycStatus: kycCheck.status,
              message: `KYC verification required for loan origination. Current status: '${kycCheck.status}'.`,
            });
            return;
          }
        }
      }

      // 2. Check borrower KYC in DB if registered
      const borrowerUsers = await db.select().from(User).where(eq(User.accountId, borrowerAddress)).limit(1);
      if (borrowerUsers.length > 0) {
        const borrowerKyc = await kycService.isUserApproved(borrowerUsers[0].userId);
        if (!borrowerKyc.approved) {
          res.status(403).json({
            success: false,
            error: 'KYC_NOT_APPROVED',
            kycStatus: borrowerKyc.status,
            message: `Borrower (${borrowerAddress}) KYC verification required for loan origination. Current status: '${borrowerKyc.status}'.`,
          });
          return;
        }
      }

      const params: MintSagParams = {
        pawnshopAddress,
        borrowerAddress,
        weightGrams: Number(weightGrams),
        karat: Number(karat),
        appraisedValueUSD: Number(appraisedValueUSD),
        loanAmount: Number(loanAmount),
        ipfsMetadataUri: ipfsMetadataUri || `ipfs://sanad-gold-cert-${Date.now()}`,
      };

      const result = await sagService.mintCollateral(params);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/creditcoin/collateral/:tokenId
   */
  public async getCollateral(req: Request, res: Response): Promise<void> {
    try {
      const tokenId = Array.isArray(req.params.tokenId) ? req.params.tokenId[0] : req.params.tokenId;
      const data = await sagService.getCollateral(String(tokenId));
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  // =========================================================================
  // COMPLIANCE ACTIONS (FREEZE, UNFREEZE, WIPE)
  // =========================================================================

  /**
   * POST /api/v1/creditcoin/compliance/freeze
   * Body: { type: 'token' | 'address', target: string | number, reason: string }
   */
  public async complianceFreeze(req: Request, res: Response): Promise<void> {
    try {
      const { type, target, reason } = req.body;
      if (!type || !target || !reason) {
        res.status(400).json({ success: false, error: 'Missing type, target, or reason' });
        return;
      }

      let result;
      if (type === 'token') {
        result = await sagService.freezeToken(target, reason);
      } else if (type === 'address') {
        result = await sagService.freezeAddress(target.toString(), reason);
      } else {
        res.status(400).json({ success: false, error: 'Invalid freeze type. Must be token or address' });
        return;
      }

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/compliance/unfreeze
   * Body: { type: 'token' | 'address', target: string | number, reason: string }
   */
  public async complianceUnfreeze(req: Request, res: Response): Promise<void> {
    try {
      const { type, target, reason } = req.body;
      if (!type || !target || !reason) {
        res.status(400).json({ success: false, error: 'Missing type, target, or reason' });
        return;
      }

      let result;
      if (type === 'token') {
        result = await sagService.unfreezeToken(target, reason);
      } else if (type === 'address') {
        result = await sagService.unfreezeAddress(target.toString(), reason);
      } else {
        res.status(400).json({ success: false, error: 'Invalid unfreeze type. Must be token or address' });
        return;
      }

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/compliance/wipe
   * Body: { tokenId: string | number, reason: string }
   */
  public async complianceWipe(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, reason } = req.body;
      if (!tokenId || !reason) {
        res.status(400).json({ success: false, error: 'Missing tokenId or reason' });
        return;
      }

      const result = await sagService.adminWipe(tokenId, reason);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/creditcoin/compliance/status
   * Query: { tokenId?: string, address?: string }
   */
  public async getComplianceStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, address } = req.query;
      const status: { isTokenFrozen?: boolean; isAddressFrozen?: boolean } = {};

      if (tokenId) {
        status.isTokenFrozen = await sagService.isTokenFrozen(String(tokenId));
      }
      if (address) {
        status.isAddressFrozen = await sagService.isAddressFrozen(String(address));
      }

      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/creditcoin/audit-logs
   */
  public async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId } = req.query;
      const logs = await indexerService.getAuditLogs(tokenId ? String(tokenId) : undefined);
      res.status(200).json({ success: true, count: logs.length, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/audit-logs
   * Body: { eventType: string, details: any, tokenId?: string, contractAddress?: string, transactionHash?: string }
   */
  public async createAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { eventType, details, tokenId, contractAddress, transactionHash, blockNumber } = req.body;
      if (!eventType || !details) {
        res.status(400).json({ success: false, error: 'Missing eventType or details' });
        return;
      }

      const log = await indexerService.recordAuditLog({
        eventType,
        details,
        tokenId,
        contractAddress,
        transactionHash,
        blockNumber,
      });

      res.status(201).json({ success: true, log });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const creditcoinController = new CreditcoinController();

