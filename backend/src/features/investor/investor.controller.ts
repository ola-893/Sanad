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
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization || '';
      const investorInfo = await getUserDataByToken(token);
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
      res.status(200).json({
        success: true,
        data: {
          totalPoolLiquidityCTC: '0.0',
          userLpBalanceCTC: '0.0',
          kycStatus: 'not_started',
          isKycApproved: false,
          network: 'Creditcoin 3 Testnet',
        }
      });
    }
  }

  /**
   * Retrieves SAG NFT collateral notes associated with the investor
   */
  async getInvestorNFTInfo(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization || '';
      const investorInfo = await getUserDataByToken(token);

      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!investorInfo.accountId) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

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
      console.error('Error fetching investor NFTs:', error);
      res.status(200).json({ success: true, data: [] });
    }
  }

  /**
   * Retrieves current wallet balance on Creditcoin CC3
   */
  async getInvestorWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.headers.authorization || '';
      const investorInfo = await getUserDataByToken(token);

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
      console.error('Error fetching wallet balance:', error);
      res.status(200).json({
        success: true,
        data: { address: '', balanceCTC: '0.0', network: 'Creditcoin 3 Testnet' }
      });
    }
  }
}

export const investorController = new InvestorController();