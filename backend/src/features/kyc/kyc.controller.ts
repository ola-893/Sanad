import { Request, Response } from 'express';
import { KycService, SubmitKycParams, ReviewKycParams } from './kyc.service.js';
import { getUserDataByToken } from '../auth/auth.repository.js';

export class KycController {
  private kycService: KycService;

  constructor() {
    this.kycService = new KycService();
  }

  /**
   * POST /api/v1/kyc/submit
   * Accepts user personal info and IC front/back images
   */
  public async submitKyc(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      let authenticatedUserId: string | undefined;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await getUserDataByToken(token);
        if (user) {
          authenticatedUserId = user.userId;
        }
      }

      const {
        userId,
        firstName,
        lastName,
        email,
        phone,
        icNo,
        icFrontPicture,
        icBackPicture,
        documentType,
        address,
        city,
        state,
        postalCode,
        dateOfBirth,
        nationality,
        // Attestcoin Protocol — Credit Bureau fields
        ethereumWalletAddress,
        creditScore,
        creditTier,
        attestcoinProofTx,
      } = req.body;

      const targetUserId = authenticatedUserId || userId;

      if (!targetUserId) {
        res.status(400).json({ success: false, error: 'Missing userId parameter' });
        return;
      }

      if (!icNo) {
        res.status(400).json({ success: false, error: 'Missing required IC number (icNo)' });
        return;
      }

      const params: SubmitKycParams = {
        userId: targetUserId,
        firstName,
        lastName,
        email,
        phone,
        icNo: String(icNo),
        icFrontPicture: icFrontPicture || 'default_front.jpg',
        icBackPicture: icBackPicture || 'default_back.jpg',
        documentType: documentType || 'MyKad',
        address,
        city,
        state,
        postalCode,
        dateOfBirth,
        nationality,
        // Attestcoin Protocol — Credit Bureau
        ethereumWalletAddress,
        creditScore: creditScore !== undefined ? Number(creditScore) : undefined,
        creditTier,
        attestcoinProofTx,
      };

      const result = await this.kycService.submitKyc(params);

      res.status(201).json({
        success: true,
        message: 'KYC application submitted successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('[KYC] Error in submitKyc:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/kyc/status/:userId
   */
  public async getKycStatus(req: Request, res: Response): Promise<void> {
    try {
      const rawUserId = req.params.userId;
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

      if (!userId) {
        res.status(400).json({ success: false, error: 'User ID is required' });
        return;
      }

      const statusData = await this.kycService.getKycStatusByUserId(String(userId));
      res.status(200).json({
        success: true,
        data: statusData,
      });
    } catch (error: any) {
      console.error('[KYC] Error in getKycStatus:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/kyc/pending
   * Returns queue of pending applications for compliance review
   */
  public async getPendingKyc(req: Request, res: Response): Promise<void> {
    try {
      const pendingList = await this.kycService.getPendingSubmissions();
      res.status(200).json({
        success: true,
        count: pendingList.length,
        data: pendingList,
      });
    } catch (error: any) {
      console.error('[KYC] Error in getPendingKyc:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/kyc/all
   * Returns all KYC applications with optional status filter
   */
  public async getAllKyc(req: Request, res: Response): Promise<void> {
    try {
      const statusFilter = req.query.status ? String(req.query.status) : undefined;
      const applications = await this.kycService.getAllSubmissions(statusFilter);
      res.status(200).json({
        success: true,
        count: applications.length,
        data: applications,
      });
    } catch (error: any) {
      console.error('[KYC] Error in getAllKyc:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/kyc/:id/review
   * Approves, rejects, or approves with EDD
   */
  public async reviewKyc(req: Request, res: Response): Promise<void> {
    try {
      const rawId = req.params.id;
      const submissionId = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!submissionId) {
        res.status(400).json({ success: false, error: 'Submission ID is required' });
        return;
      }

      const authHeader = req.headers.authorization;
      let reviewerId = 'USR_COMPLIANCE_001';
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await getUserDataByToken(token);
        if (user && user.userId) {
          reviewerId = user.userId;
        }
      }

      const {
        status,
        riskScore,
        amlStatus,
        flags,
        notes,
        eddSourceOfFunds,
        eddApprovedBy,
        nextReviewDate,
      } = req.body;

      if (!status || !['approved', 'approved_with_edd', 'rejected', 'under_review'].includes(status)) {
        res.status(400).json({
          success: false,
          error: "Invalid status. Must be 'approved', 'approved_with_edd', 'rejected', or 'under_review'",
        });
        return;
      }

      const reviewParams: ReviewKycParams = {
        submissionId: String(submissionId),
        reviewerId: req.body.reviewerId || reviewerId,
        status,
        riskScore: riskScore !== undefined ? Number(riskScore) : undefined,
        amlStatus,
        flags: Array.isArray(flags) ? flags : undefined,
        notes,
        eddSourceOfFunds,
        eddApprovedBy,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
      };

      const updated = await this.kycService.reviewSubmission(reviewParams);

      res.status(200).json({
        success: true,
        message: `KYC submission successfully updated to '${status}'`,
        data: updated,
      });
    } catch (error: any) {
      console.error('[KYC] Error in reviewKyc:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/kyc/audit-logs
   */
  public async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId ? String(req.query.userId) : undefined;
      const logs = await this.kycService.getComplianceAuditLogs(userId);
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs,
      });
    } catch (error: any) {
      console.error('[KYC] Error in getAuditLogs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const kycController = new KycController();
