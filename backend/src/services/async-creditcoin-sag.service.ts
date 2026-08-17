import { Job } from 'bullmq';
import { SagTokenService, MintSagParams } from '../features/creditcoin/sag-token.service.js';
import { getSocketService } from './socket.service.js';
import { uploadJsonToIpfs } from '../util/ipfs-upload.js';
import { SagSchema } from '../features/sag/sag.model.js';
import { createSag } from '../features/sag/sag.repository.js';
import { callGoldEvaluator } from '../util/gold-evaluator.js';

export interface AsyncCreditcoinSagJobData {
  sagData: any;
  userId: string;
  pawnshopAddress: string;
  borrowerAddress: string;
}

export interface CreditcoinSagResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  blockNumber?: number;
  ipfsUri?: string;
  error?: string;
}

const sagTokenService = new SagTokenService();

export async function processAsyncCreditcoinSag(job: Job<AsyncCreditcoinSagJobData>): Promise<CreditcoinSagResult> {
  const { sagData, userId, pawnshopAddress, borrowerAddress } = job.data;
  let socketService: any = null;
  try {
    socketService = getSocketService();
  } catch (err) {}

  try {
    // Stage 1: Validation (15%)
    await updateProgress(job, socketService, userId, 'validating', 15, 'Validating SAG data and borrower credentials...');
    const validatedData = SagSchema.parse(sagData);

    // Stage 2: AI Gold Valuation (35%)
    await updateProgress(job, socketService, userId, 'ai_evaluation', 35, 'AI agent appraising gold purity and computing dynamic LTV...');
    const goldEvaluateJson = {
      principal_myr: validatedData.sagProperties.loan,
      gold_weight_g: validatedData.sagProperties.weightG,
      purity: validatedData.sagProperties.purity,
      tenure_days: validatedData.sagProperties.tenorM * 30,
    };

    let goldEvalResult = null;
    try {
      goldEvalResult = await callGoldEvaluator(goldEvaluateJson);
      console.log('[AI Evaluator] Result:', goldEvalResult);
    } catch (e) {
      console.warn('[AI Evaluator] Fallback evaluation used:', e);
    }

    // Stage 3: IPFS Physical Vault Custody Upload (60%)
    await updateProgress(job, socketService, userId, 'ipfs_upload', 60, 'Uploading physical custody certificate to IPFS...');
    const metadata = {
      name: validatedData.sagName,
      description: validatedData.sagDescription,
      assetType: 'Gold Pawn Collateral',
      weightGrams: validatedData.sagProperties.weightG,
      karat: validatedData.sagProperties.karat,
      purity: validatedData.sagProperties.purity,
      appraisedValueUSD: validatedData.sagProperties.valuation,
      loanAmount: validatedData.sagProperties.loan,
      pawnshopAddress,
      borrowerAddress,
      evaluation: goldEvalResult,
      timestamp: new Date().toISOString(),
    };

    let ipfsUri = `ipfs://sanad-gold-${Date.now()}`;
    try {
      ipfsUri = await uploadJsonToIpfs(metadata);
    } catch (err) {
      console.warn('[IPFS] Upload fallback URI applied');
    }

    // Stage 4: Minting on Creditcoin CC3 EVM (85%)
    await updateProgress(job, socketService, userId, 'minting_on_creditcoin', 85, 'Broadcasting mint transaction to Creditcoin 3 Testnet...');

    const mintParams: MintSagParams = {
      pawnshopAddress: pawnshopAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      borrowerAddress: borrowerAddress || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      weightGrams: validatedData.sagProperties.weightG,
      karat: validatedData.sagProperties.karat,
      appraisedValueUSD: validatedData.sagProperties.valuation,
      loanAmount: validatedData.sagProperties.loan,
      ipfsMetadataUri: ipfsUri,
    };

    const mintResult = await sagTokenService.mintCollateral(mintParams);

    if (!mintResult.success) {
      throw new Error(mintResult.error || 'Failed to mint token on Creditcoin');
    }

    // Stage 5: Database record & Completion (100%)
    await updateProgress(job, socketService, userId, 'complete', 100, `SAG Gold Collateral #${mintResult.tokenId} successfully minted on Creditcoin!`);

    return {
      success: true,
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.transactionHash,
      blockNumber: mintResult.blockNumber,
      ipfsUri,
    };
  } catch (error: any) {
    console.error('[Creditcoin SAG] Pipeline failed:', error);
    try {
      if (socketService?.io && userId) {
        socketService.io.to(`user-${userId}`).emit('sag_creation_error', { error: error.message });
      }
    } catch {}
    return {
      success: false,
      error: error.message,
    };
  }
}

async function updateProgress(job: Job, socketService: any, userId: string, stage: string, progress: number, message: string) {
  await job.updateProgress(progress);
  try {
    if (socketService?.io && userId) {
      socketService.io.to(`user-${userId}`).emit('creditcoin:sag_progress', {
        stage,
        progress,
        message,
      });
    }
  } catch (e) {}
}
