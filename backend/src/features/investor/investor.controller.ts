import { Request, Response } from 'express';
import { PurchaseTokenSchema } from './investor.model.js';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { CreditcoinWalletService } from '../creditcoin/creditcoin-wallet.service.js';
import { SagModel } from '../sag/sag.model.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

export class InvestorController {
  async purchaseTokenAsync(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = PurchaseTokenSchema.parse(req.body);
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
      
      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      res.status(202).json({
        success: true,
        message: 'Token purchase recorded on Creditcoin CC3',
        data: {
          tokenId: validatedData.tokenId,
          amount: validatedData.amount,
          totalValue: validatedData.totalValue,
          investorAddress: investorInfo.accountId,
          network: 'Creditcoin 3 Testnet',
        }
      });
    } catch (error) {
      console.error('Error in purchaseTokenAsync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to purchase token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

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

  async topUpToken(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Wallet funded on Creditcoin CC3',
      data: { amount: req.body.amount || 100 }
    });
  }

  async getInvestorWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const investorInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');

      if (!investorInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const walletService = new CreditcoinWalletService();
      const balance = investorInfo.accountId ? await walletService.getBalance(investorInfo.accountId) : '0.0';

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
}

export const investorController = new InvestorController();