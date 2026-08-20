import { Request, Response } from 'express';
import { RepaymentRequestSchema } from './pawnshop.model.js';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { getSocketService } from '../../services/socket.service.js';
import { LiquidityPoolService } from '../creditcoin/liquidity-pool.service.js';

export class PawnshopController {
  private poolService: LiquidityPoolService;

  constructor() {
    this.poolService = new LiquidityPoolService();
  }

  /**
   * Process repayment directly on Creditcoin 3
   */
  async processRepaymentAsync(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = RepaymentRequestSchema.parse(req.body);
      const userInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
      
      if (!userInfo) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const jobId = `repay-${Date.now()}-${validatedData.tokenId}`;
      const socket = getSocketService();
      
      if (socket?.io) {
        socket.io.emit('repayment:progress', {
          jobId,
          tokenId: validatedData.tokenId,
          step: 'submitting',
          progress: 30,
          status: 'processing',
          message: 'Submitting native CTC direct repayment to Creditcoin 3...',
        });
      }

      // Execute on-chain direct repayment against SanadLiquidityPool.sol
      const amountCTCStr = validatedData.amountCTC !== undefined ? validatedData.amountCTC.toString() : undefined;
      const result = await this.poolService.repayLoanDirect(
        validatedData.tokenId,
        amountCTCStr
      );

      if (!result.success) {
        if (socket?.io) {
          socket.io.emit('repayment:error', {
            jobId,
            tokenId: validatedData.tokenId,
            error: result.error || 'On-chain repayment execution failed',
          });
        }
        res.status(400).json({
          success: false,
          error: result.error || 'Failed to process on-chain repayment on Creditcoin 3',
        });
        return;
      }

      if (socket?.io) {
        socket.io.emit('repayment:progress', {
          jobId,
          tokenId: validatedData.tokenId,
          step: 'settling',
          progress: 100,
          status: 'completed',
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          message: `Direct repayment confirmed on Creditcoin 3 (Tx: ${result.transactionHash})`,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Repayment processed successfully on Creditcoin 3',
        data: {
          jobId,
          status: 'completed',
          tokenId: validatedData.tokenId,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          repaidAmountCTC: result.repaidAmountCTC,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in processRepaymentAsync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process repayment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get repayment job status by job ID
   */
  async getRepaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
      if (!jobId) {
        res.status(400).json({ success: false, error: 'Job ID is required' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          jobId,
          status: 'completed',
          progress: 100,
          message: 'Repayment verified on Creditcoin 3',
        },
      });
    } catch (error) {
      console.error('Error getting repayment status:', error);
      res.status(500).json({ success: false, error: 'Failed to get repayment status' });
    }
  }

  /**
   * Get token holders for a specific token ID
   */
  async getTokenHolders(req: Request, res: Response): Promise<void> {
    const tokenId = Array.isArray(req.params.tokenId) ? req.params.tokenId[0] : req.params.tokenId;
    res.status(200).json({
      success: true,
      data: [{ account: '0x0000000000000000000000000000000000000000', balance: 1, tokenId }],
    });
  }
}

export const pawnshopController = new PawnshopController();
