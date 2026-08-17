import { Request, Response } from 'express';
import { createSag, getSag, updateSag, overrideFailureSag } from './sag.repository.js';
import { SagModel, SagModelInsertType, SagModelType, SagSchema, GoldEvaluatorOutputSchema, SagOverrideFailureSchema } from './sag.model.js';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { uploadJsonToIpfs } from '@/util/ipfs-upload.js';
import { callGoldEvaluator, GoldEvaluatorOutput } from '@/util/gold-evaluator.js';
import { sagCreationQueue, JOB_TYPES } from '../../bullmq/scheduler.js';
import { SagTokenService } from '../creditcoin/sag-token.service.js';

export const createSagController = async (req: Request, res: Response) => {
    try {
        const sagData = SagSchema.parse(req.body);
        const userInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
        const goldEvaluateJson = {
            "principal_myr": sagData.sagProperties.loan,
            "gold_weight_g": sagData.sagProperties.weightG,
            "purity": sagData.sagProperties.purity,
            "tenure_days": sagData.sagProperties.tenorM * 30
        };
        
        if (!sagData) {
            return res.status(400).json({ error: 'SAG data is required' });
        }
        sagData.sagType = sagData.sagType || 'Conventional';

        let goldEvaluateResult: GoldEvaluatorOutput | null = null;
        let sagResult: SagModelType[] | null = null;
        let mintResult: any = null;
        const sagTokenService = new SagTokenService();

        try {
            goldEvaluateResult = await callGoldEvaluator(goldEvaluateJson);
        } catch (e) {
            console.warn('[AI Evaluator] Warning calling evaluator, using standard appraisal:', e);
        }

        const ipfsMetadata = await uploadJsonToIpfs({
            ...sagData.sagProperties,
            evaluation: goldEvaluateResult,
        });

        await db.transaction(async (tx) => {
            sagResult = await createSag({...sagData, tokenId: ''}, tx);    
            
            // Mint on Creditcoin CC3
            mintResult = await sagTokenService.mintCollateral({
                pawnshopAddress: userInfo?.accountId || '0x0000000000000000000000000000000000000000',
                borrowerAddress: userInfo?.accountId || '0x0000000000000000000000000000000000000000',
                weightGrams: sagData.sagProperties.weightG,
                karat: sagData.sagProperties.purity >= 990 ? 24 : sagData.sagProperties.purity >= 916 ? 22 : 18,
                appraisedValueUSD: sagData.sagProperties.loan * 1.5,
                loanAmount: sagData.sagProperties.loan,
                ipfsMetadataUri: ipfsMetadata,
            });

            await tx.update(SagModel).set({
                tokenId: mintResult.tokenId || '',
                sagProperties: {
                    ...sagData.sagProperties,
                    risk_level: goldEvaluateResult?.metrics.risk_level || 'LOW',
                    ltv: goldEvaluateResult?.metrics.ltv || 67,
                    action: goldEvaluateResult?.recommendation.action || 'approve',
                    rationale: goldEvaluateResult?.recommendation.rationale || 'Collateral appraised',
                    eval_id: goldEvaluateResult?.eval_id || 'eval-cc3'
                }
            }).where(eq(SagModel.sagId, sagResult[0].sagId));    
        });

        res.status(201).json({
            success: true,
            message: 'SAG created successfully on Creditcoin CC3',
            data: {
                sag: sagResult,
                token: {
                    tokenId: mintResult?.tokenId,
                    transactionHash: mintResult?.transactionHash,
                    network: 'Creditcoin 3 Testnet',
                },
            }
        });
    } catch (error) {
        console.error('Error creating SAG:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create SAG',
            details: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
}

export const createSagAsyncController = async (req: Request, res: Response) => {
    try {
        const sagData = SagSchema.parse(req.body);
        if (!sagData) {
            return res.status(400).json({ error: 'SAG data is required' });
        }

        const userInfo = await getUserDataByToken(req.headers.authorization?.split(' ')[1] || '');
        if (!userInfo) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }

        console.log(`[${new Date().toISOString()}] Queuing async SAG creation for ${sagData.sagName} by user ${userInfo.accountId}`);

        const job = await sagCreationQueue.add(
            JOB_TYPES.CREATE_SAG,
            {
                sagData,
                userId: userInfo.accountId || '',
                pawnshopAddress: userInfo.accountId || '',
                borrowerAddress: userInfo.accountId || '',
            },
            {
                jobId: `sag-cc3-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                priority: 1,
            }
        );

        res.status(202).json({
            success: true,
            message: 'SAG creation job queued successfully on Creditcoin CC3',
            data: {
                jobId: job.id,
                status: 'QUEUED',
                statusUrl: `/api/v1/sag/status/${job.id}`,
                estimatedTimeSeconds: 5,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in createSagAsyncController:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to queue SAG creation job',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
};

export const getSagCreationStatusController = async (req: Request, res: Response) => {
    try {
        const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
        if (!jobId) {
            res.status(400).json({ success: false, error: 'Job ID is required' });
            return;
        }

        const job = await sagCreationQueue.getJob(jobId);
        if (!job) {
            res.status(404).json({ success: false, error: 'Job not found' });
            return;
        }

        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        res.status(200).json({
            success: true,
            data: {
                jobId: job.id,
                state: state.toUpperCase(),
                progress: progress || 0,
                result: result || null,
                error: failedReason || null,
            }
        });
    } catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({ success: false, error: 'Failed to get job status' });
    }
};

export const getSagController = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const sag = await getSag({ id });
        if (!sag) {
            return res.status(404).json({ error: 'SAG not found' });
        }
        res.status(200).json({ success: true, data: sag });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch SAG' });
    }
};

export const getAllSagsController = async (req: Request, res: Response) => {
    try {
        const sags = await db.select().from(SagModel);
        res.status(200).json({ success: true, data: sags });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch SAGs' });
    }
};

export const approveSagController = async (req: Request, res: Response) => {
    try {
        const { sagId } = req.body;
        await updateSag(sagId, { approvalStatus: 'approved' });
        res.status(200).json({ success: true, message: 'SAG approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to approve SAG' });
    }
};

export const rejectSagController = async (req: Request, res: Response) => {
    try {
        const { sagId } = req.body;
        await updateSag(sagId, { approvalStatus: 'rejected' });
        res.status(200).json({ success: true, message: 'SAG rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to reject SAG' });
    }
};

export const overrideFailureSagController = async (req: Request, res: Response) => {
    try {
        const validatedData = SagOverrideFailureSchema.parse(req.body);
        const sag = await overrideFailureSag(validatedData);
        res.status(200).json({ success: true, message: 'SAG failure overridden', data: sag });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to override SAG failure' });
    }
};
