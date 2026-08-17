import { Request, Response } from 'express';
import { CreditcoinClient } from './creditcoin.client.js';
import { SagTokenService, MintSagParams } from './sag-token.service.js';
import { AttestcoinRelayerService } from './attestcoin-relayer.service.js';
import { CreditcoinIndexerService } from './creditcoin-indexer.service.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { queueAsyncAttestcoinRepayment, getRepaymentJobStatus } from '../../services/async-attestcoin-repayment.service.js';

const sagService = new SagTokenService();
const relayerService = new AttestcoinRelayerService();
const indexerService = new CreditcoinIndexerService();

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
          proverUrl: CREDITCOIN_CONFIG.proverUrl,
          blockProverAddress: CREDITCOIN_CONFIG.blockProverAddress,
          chainInfoAddress: CREDITCOIN_CONFIG.chainInfoAddress,
          contracts: CREDITCOIN_CONFIG.contracts,
          sourceChain: CREDITCOIN_CONFIG.sourceChain,
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

      const params: MintSagParams = {
        pawnshopAddress,
        borrowerAddress,
        weightGrams: Number(weightGrams),
        karat: Number(karat),
        appraisedValueUSD: Number(appraisedValueUSD),
        loanAmount: Number(loanAmount),
        ipfsMetadataUri: ipfsMetadataUri || '',
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
      const tokenId = String(req.params.tokenId);
      const data = await sagService.getCollateral(tokenId);
      res.status(200).json({ success: true, tokenId, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/repayment/submit (NON-BLOCKING / RECOMMENDED)
   * Queues an asynchronous background job to wait for attestation, generate proof, and settle on CC3.
   * Returns immediately with 202 Accepted.
   */
  public async submitAsyncRepayment(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, sourceTxHash, repaidAmountUSD, sourceEvmChainId, userId } = req.body;

      if (!tokenId || !sourceTxHash || !repaidAmountUSD) {
        res.status(400).json({ success: false, error: 'Missing tokenId, sourceTxHash, or repaidAmountUSD' });
        return;
      }

      const job = queueAsyncAttestcoinRepayment({
        tokenId: tokenId.toString(),
        sourceTxHash,
        repaidAmountUSD: Number(repaidAmountUSD),
        userId: userId || (req as any).user?.id,
        sourceEvmChainId: sourceEvmChainId ? Number(sourceEvmChainId) : undefined,
      });

      res.status(202).json({
        success: true,
        message: 'Repayment submitted for background Attestcoin proof generation & settlement',
        jobId: job.jobId,
        status: job.status,
        statusEndpoint: `/api/v1/creditcoin/repayment/status/${job.jobId}`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/creditcoin/repayment/status/:jobId
   * Checks the progress and status of an asynchronous repayment job
   */
  public async getRepaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = String(req.params.jobId);
      const status = getRepaymentJobStatus(jobId);

      if (!status) {
        res.status(404).json({ success: false, error: `Job ${jobId} not found` });
        return;
      }

      res.status(200).json({ success: true, job: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/creditcoin/repayment/verify-and-settle (Synchronous Fallback)
   */
  public async verifyAndSettleRepayment(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, sourceTxHash, repaidAmountUSD, sourceEvmChainId } = req.body;

      if (!tokenId || !sourceTxHash || !repaidAmountUSD) {
        res.status(400).json({ success: false, error: 'Missing tokenId, sourceTxHash, or repaidAmountUSD' });
        return;
      }

      const result = await relayerService.relayAndSettleRepayment({
        tokenId: tokenId.toString(),
        sourceTxHash,
        repaidAmountUSD: Number(repaidAmountUSD),
        sourceEvmChainId: sourceEvmChainId ? Number(sourceEvmChainId) : undefined,
      });

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
}
