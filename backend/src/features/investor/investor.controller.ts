import { Request, Response } from 'express';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { CreditcoinWalletService } from '../creditcoin/creditcoin-wallet.service.js';
import { LiquidityPoolService } from '../creditcoin/liquidity-pool.service.js';
import { SagModel } from '../sag/sag.model.js';
import { KycService } from '../kyc/kyc.service.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

export class InvestorController {
  private kycService: KycService;
  private poolService: LiquidityPoolService;
  private walletService: CreditcoinWalletService;

  constructor() {
    this.kycService = new KycService();
    this.poolService = new LiquidityPoolService();
    this.walletService = new CreditcoinWalletService();
  }

  /**
   * Retrieves on-chain liquidity pool stats and the investor's LP balance
   */
  async getPoolStats(req: Request, res: Response): Promise<void> {
    try {
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
      const totalLiquidity = await this.poolService.getTotalPoolLiquidity();
      let userLpBalance = '0.0';
      let kycStatus = 'not_started';
      let isKycApproved = false;

      if (investorInfo) {
        if (investorInfo.accountId) {
          userLpBalance = await this.poolService.getLpBalance(investorInfo.accountId);
        }
        if (investorInfo.userId) {
          const kycCheck = await this.kycService.isUserApproved(investorInfo.userId);
          kycStatus = kycCheck.status;
          isKycApproved = kycCheck.approved;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          totalPoolLiquidityCTC: totalLiquidity,
          userLpBalanceCTC: userLpBalance,
          kycStatus,
          isKycApproved,
          network: 'Creditcoin 3 Testnet',
        }
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pool stats' });
    }
  }

  /**
   * Retrieves SAG NFT collateral notes associated with the investor
   */
  async getInvestorNFTInfo(req: Request, res: Response): Promise<void> {
    try {
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');

      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Filter SAGs by the authenticated user's wallet address
      const sags = await db
        .select()
        .from(SagModel)
        .where(eq(SagModel.originalOwner, investorInfo.accountId))
        .limit(20);

      res.status(200).json({
        success: true,
        data: sags.map(s => ({
          tokenId: s.tokenId,
          name: s.sagName,
          status: s.status,
          properties: s.sagProperties,
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch NFT info' });
    }
  }

  /**
   * Retrieves current wallet balance on Creditcoin CC3
   */
  async getInvestorWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');

      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const balance = investorInfo.accountId ? await this.walletService.getBalance(investorInfo.accountId) : '0.0';

      res.status(200).json({
        success: true,
        data: {
          address: investorInfo.accountId,
          balanceCTC: balance,
          network: 'Creditcoin 3 Testnet',
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch balance' });
    }
  }

  /**
   * Cryptographically prove a Sepolia investor deposit transaction and credit LP balance on CC3
   * POST /api/v1/investor/deposit/prove
   */
  async proveDeposit(req: Request, res: Response): Promise<void> {
    try {
      const { sourceTxHash, chainKey = 1 } = req.body;
      if (!sourceTxHash) {
        res.status(400).json({ success: false, error: 'sourceTxHash is required' });
        return;
      }

      const { AttestcoinOracleRelayerService } = await import('@/core/credit-bureau/attestcoin-oracle-relayer.service.js');
      const relayerService = new AttestcoinOracleRelayerService();
      const result = await relayerService.proveAndRecordSepoliaDeposit(sourceTxHash, Number(chainKey));

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sepolia deposit verified and LP balance credited successfully on Creditcoin CC3',
        data: result,
      });
    } catch (error: any) {
      console.error('Error proving Sepolia deposit:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }

  /**
   * POST /investor/invest -- Record an investment in a SAG token
   */
  async recordInvestment(req: Request, res: Response): Promise<void> {
    try {
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sagTokenId, amountUsd } = req.body;
      if (!sagTokenId || !amountUsd) {
        res.status(400).json({ success: false, error: 'sagTokenId and amountUsd are required' });
        return;
      }

      // Find the pledge request by sagTokenId
      const { pool } = await import('@/db/index.js');
      const result = await pool.query(
        `SELECT id, investment_target_usd, investment_filled_usd, min_investment_usd, status
         FROM main.pledge_request WHERE sag_token_id = $1`,
        [sagTokenId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'SAG token not found' });
        return;
      }

      const request = result.rows[0];
      const target = Number(request.investment_target_usd) || 0;
      const filled = Number(request.investment_filled_usd) || 0;
      const minInvestment = Number(request.min_investment_usd) || 100;
      const remaining = target - filled;

      // Validation: check if target is reached
      if (remaining <= 0) {
        res.status(400).json({ success: false, error: 'Investment target has been reached. No more investments accepted.' });
        return;
      }

      // Validation: check minimum investment
      if (amountUsd < minInvestment) {
        res.status(400).json({ success: false, error: `Minimum investment is $${minInvestment}` });
        return;
      }

      // Validation: check if investment exceeds remaining
      if (amountUsd > remaining) {
        res.status(400).json({ success: false, error: `Investment exceeds remaining amount. Maximum: $${Math.round(remaining)}` });
        return;
      }

      // Update investment filled
      const newFilled = filled + amountUsd;
      await pool.query(
        `UPDATE main.pledge_request SET investment_filled_usd = $1, updated_at = NOW() WHERE id = $2`,
        [String(newFilled), request.id]
      );

      res.status(200).json({
        success: true,
        message: 'Investment recorded successfully',
        data: {
          sagTokenId,
          amountUsd,
          totalFilled: newFilled,
          target,
          fullyFunded: newFilled >= target,
        },
      });
    } catch (error: any) {
      console.error('Error recording investment:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  }
}

export const investorController = new InvestorController();