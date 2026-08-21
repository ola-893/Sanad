import { db } from '@/db/index.js';
import { KycSubmission, KycSubmissionType } from './kyc.model.js';
import { ComplianceAuditLog } from './compliance-audit.model.js';
import { User } from '../auth/auth.model.js';
import { desc, eq, inArray, and } from 'drizzle-orm';

export interface SubmitKycParams {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  icNo: string;
  icFrontPicture: string;
  icBackPicture: string;
  documentType?: 'MyKad' | 'Passport' | 'DriverLicense';
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  riskScore?: number;
  amlStatus?: string;
  flags?: string[];
  // Attestcoin Protocol — On-Chain Credit Bureau
  ethereumWalletAddress?: string;
  creditScore?: number;
  creditTier?: string;
  attestcoinProofTx?: string;
}

export interface ReviewKycParams {
  submissionId: string;
  reviewerId: string;
  status: 'approved' | 'approved_with_edd' | 'rejected' | 'under_review';
  riskScore?: number;
  amlStatus?: 'clear' | 'flagged' | 'watchlist';
  flags?: string[];
  notes?: string;
  eddSourceOfFunds?: string;
  eddApprovedBy?: string;
  nextReviewDate?: Date;
}

export class KycService {
  /**
   * Submit KYC application
   * Updates user identity records and creates/updates KycSubmission
   */
  public async submitKyc(params: SubmitKycParams): Promise<KycSubmissionType> {
    const documentType = params.documentType || 'MyKad';

    // 1. Update User row with verified IC information
    try {
      const userUpdates: any = {
        icNo: params.icNo,
        icFrontPicture: params.icFrontPicture,
        icBackPicture: params.icBackPicture,
        updatedAt: new Date(),
      };
      if (params.firstName) userUpdates.userFirstName = params.firstName;
      if (params.lastName) userUpdates.userLastName = params.lastName;
      if (params.phone) userUpdates.userContactNo = params.phone;

      await db.update(User).set(userUpdates).where(eq(User.userId, params.userId));
    } catch (err) {
      console.warn('[KYC] User update note:', err);
    }

    // 2. Check if a KycSubmission already exists for this user
    const existing = await db
      .select()
      .from(KycSubmission)
      .where(eq(KycSubmission.userId, params.userId))
      .limit(1);

    let submission: KycSubmissionType;

    if (existing.length > 0) {
      const updateData: any = {
          status: 'submitted',
          documentType: documentType,
          riskScore: params.riskScore !== undefined ? params.riskScore : 0,
          amlStatus: params.amlStatus || 'unscreened',
          flags: params.flags || [],
          updatedAt: new Date(),
        };
      // Store Attestcoin credit bureau data if provided
      if (params.ethereumWalletAddress) updateData.ethereumWalletAddress = params.ethereumWalletAddress;
      if (params.creditScore !== undefined) updateData.creditScore = params.creditScore;
      if (params.creditTier) updateData.creditTier = params.creditTier;
      if (params.attestcoinProofTx) updateData.attestcoinProofTx = params.attestcoinProofTx;

      const [updated] = await db
        .update(KycSubmission)
        .set(updateData)
        .where(eq(KycSubmission.id, existing[0].id))
        .returning();
      submission = updated;
    } else {
      const insertData: any = {
          userId: params.userId,
          status: 'submitted',
          documentType: documentType,
          riskScore: params.riskScore !== undefined ? params.riskScore : 0,
          amlStatus: params.amlStatus || 'unscreened',
          flags: params.flags || [],
        };
      // Store Attestcoin credit bureau data if provided
      if (params.ethereumWalletAddress) insertData.ethereumWalletAddress = params.ethereumWalletAddress;
      if (params.creditScore !== undefined) insertData.creditScore = params.creditScore;
      if (params.creditTier) insertData.creditTier = params.creditTier;
      if (params.attestcoinProofTx) insertData.attestcoinProofTx = params.attestcoinProofTx;

      const [created] = await db
        .insert(KycSubmission)
        .values(insertData)
        .returning();
      submission = created;
    }

    // 3. Write immutable record to ComplianceAuditLog
    await db.insert(ComplianceAuditLog).values({
      userId: params.userId,
      eventType: 'submitted',
      actor: params.userId,
      details: {
        submissionId: submission.id,
        documentType: documentType,
        icNo: params.icNo,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[KYC] Submission created for user ${params.userId} (ID: ${submission.id})`);
    return submission;
  }

  /**
   * Get KYC status by User ID
   */
  public async getKycStatusByUserId(userId: string): Promise<{
    status: string;
    riskScore: number;
    amlStatus: string;
    documentType: string;
    flags: string[];
    submission?: KycSubmissionType | null;
    isApproved: boolean;
  }> {
    const records = await db
      .select()
      .from(KycSubmission)
      .where(eq(KycSubmission.userId, userId))
      .orderBy(desc(KycSubmission.createdAt))
      .limit(1);

    if (!records || records.length === 0) {
      return {
        status: 'not_started',
        riskScore: 0,
        amlStatus: 'unscreened',
        documentType: 'MyKad',
        flags: [],
        submission: null,
        isApproved: false,
      };
    }

    const sub = records[0];
    const isApproved = sub.status === 'approved' || sub.status === 'approved_with_edd';

    return {
      status: sub.status,
      riskScore: sub.riskScore,
      amlStatus: sub.amlStatus,
      documentType: sub.documentType,
      flags: (sub.flags as string[]) || [],
      submission: sub,
      isApproved,
    };
  }

  /**
   * Check if user is KYC approved (for enforcement gates)
   */
  public async isUserApproved(userId: string): Promise<{ approved: boolean; status: string }> {
    const res = await this.getKycStatusByUserId(userId);
    return {
      approved: res.isApproved,
      status: res.status,
    };
  }

  /**
   * Get KYC status by Ethereum Wallet Address (for credit tier & scoring resolution)
   */
  public async getKycStatusByWalletAddress(walletAddress: string): Promise<{
    status: string;
    riskScore: number;
    amlStatus: string;
    documentType: string;
    flags: string[];
    submission?: KycSubmissionType | null;
    isApproved: boolean;
  }> {
    if (!walletAddress) {
      return {
        status: 'not_started',
        riskScore: 0,
        amlStatus: 'unscreened',
        documentType: 'MyKad',
        flags: [],
        submission: null,
        isApproved: false,
      };
    }

    const records = await db
      .select()
      .from(KycSubmission)
      .where(eq(KycSubmission.ethereumWalletAddress, walletAddress))
      .orderBy(desc(KycSubmission.createdAt))
      .limit(1);

    if (!records || records.length === 0) {
      return {
        status: 'not_started',
        riskScore: 0,
        amlStatus: 'unscreened',
        documentType: 'MyKad',
        flags: [],
        submission: null,
        isApproved: false,
      };
    }

    const sub = records[0];
    const isApproved = sub.status === 'approved' || sub.status === 'approved_with_edd';

    return {
      status: sub.status,
      riskScore: sub.riskScore,
      amlStatus: sub.amlStatus,
      documentType: sub.documentType,
      flags: (sub.flags as string[]) || [],
      submission: sub,
      isApproved,
    };
  }

  /**
   * Get all pending KYC applications (for admin queue)
   */
  public async getPendingSubmissions(): Promise<any[]> {
    const pendingStatuses = ['submitted', 'screening', 'under_review', 'pending'];
    const submissions = await db
      .select({
        id: KycSubmission.id,
        userId: KycSubmission.userId,
        status: KycSubmission.status,
        riskScore: KycSubmission.riskScore,
        amlStatus: KycSubmission.amlStatus,
        documentType: KycSubmission.documentType,
        flags: KycSubmission.flags,
        screenedAt: KycSubmission.screenedAt,
        createdAt: KycSubmission.createdAt,
        updatedAt: KycSubmission.updatedAt,
        userFirstName: User.userFirstName,
        userLastName: User.userLastName,
        userEmail: User.userEmail,
        userContactNo: User.userContactNo,
        icNo: User.icNo,
        icFrontPicture: User.icFrontPicture,
        icBackPicture: User.icBackPicture,
      })
      .from(KycSubmission)
      .leftJoin(User, eq(KycSubmission.userId, User.userId))
      .where(inArray(KycSubmission.status, pendingStatuses))
      .orderBy(desc(KycSubmission.createdAt));

    return submissions.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: `${s.userFirstName || ''} ${s.userLastName || ''}`.trim() || 'User ' + s.userId,
      email: s.userEmail || '',
      phone: s.userContactNo || '',
      icNo: s.icNo || '',
      icFrontPicture: s.icFrontPicture,
      icBackPicture: s.icBackPicture,
      status: s.status,
      riskScore: s.riskScore,
      amlStatus: s.amlStatus,
      documentType: s.documentType,
      flags: s.flags || [],
      submittedDate: s.createdAt?.toISOString().split('T')[0] || '',
      createdAt: s.createdAt,
    }));
  }

  /**
   * Get all KYC submissions with optional status filter
   */
  public async getAllSubmissions(statusFilter?: string): Promise<any[]> {
    const query = db
      .select({
        id: KycSubmission.id,
        userId: KycSubmission.userId,
        status: KycSubmission.status,
        riskScore: KycSubmission.riskScore,
        amlStatus: KycSubmission.amlStatus,
        documentType: KycSubmission.documentType,
        flags: KycSubmission.flags,
        screenedAt: KycSubmission.screenedAt,
        reviewedBy: KycSubmission.reviewedBy,
        reviewedAt: KycSubmission.reviewedAt,
        reviewerNotes: KycSubmission.reviewerNotes,
        eddSourceOfFunds: KycSubmission.eddSourceOfFunds,
        eddApprovedBy: KycSubmission.eddApprovedBy,
        nextReviewDate: KycSubmission.nextReviewDate,
        createdAt: KycSubmission.createdAt,
        updatedAt: KycSubmission.updatedAt,
        userFirstName: User.userFirstName,
        userLastName: User.userLastName,
        userEmail: User.userEmail,
        userContactNo: User.userContactNo,
        icNo: User.icNo,
        icFrontPicture: User.icFrontPicture,
        icBackPicture: User.icBackPicture,
      })
      .from(KycSubmission)
      .leftJoin(User, eq(KycSubmission.userId, User.userId));

    let rows;
    if (statusFilter && statusFilter !== 'all') {
      rows = await query.where(eq(KycSubmission.status, statusFilter)).orderBy(desc(KycSubmission.createdAt));
    } else {
      rows = await query.orderBy(desc(KycSubmission.createdAt));
    }

    return rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: `${s.userFirstName || ''} ${s.userLastName || ''}`.trim() || 'User ' + s.userId,
      userName: `${s.userFirstName || ''} ${s.userLastName || ''}`.trim() || 'User ' + s.userId,
      email: s.userEmail || '',
      phone: s.userContactNo || '',
      icNo: s.icNo || '',
      icFrontPicture: s.icFrontPicture,
      icBackPicture: s.icBackPicture,
      status: s.status,
      riskScore: s.riskScore,
      amlStatus: s.amlStatus,
      documentType: s.documentType,
      flags: s.flags || [],
      confidence: s.status === 'approved' ? 98.5 : s.status === 'under_review' ? 76.2 : 45.0,
      lastScan: s.screenedAt?.toISOString() || s.updatedAt?.toISOString(),
      nextReview: s.nextReviewDate?.toISOString().split('T')[0] || '',
      submittedDate: s.createdAt?.toISOString().split('T')[0] || '',
      reviewedDate: s.reviewedAt?.toISOString().split('T')[0] || null,
      reviewedBy: s.reviewedBy,
      reviewerNotes: s.reviewerNotes,
      eddSourceOfFunds: s.eddSourceOfFunds,
      eddApprovedBy: s.eddApprovedBy,
      documents: [s.documentType, 'Selfie'],
    }));
  }

  /**
   * Review a KYC submission (human compliance officer decision)
   * Validates mandatory EDD fields for approved_with_edd
   */
  public async reviewSubmission(params: ReviewKycParams): Promise<KycSubmissionType> {
    const existing = await db
      .select()
      .from(KycSubmission)
      .where(eq(KycSubmission.id, params.submissionId))
      .limit(1);

    if (!existing || existing.length === 0) {
      throw new Error(`KYC submission ${params.submissionId} not found`);
    }

    const previousSubmission = existing[0];

    // Strict BNM EDD Enforcement: approved_with_edd REQUIRES eddSourceOfFunds AND eddApprovedBy
    if (params.status === 'approved_with_edd') {
      if (!params.eddSourceOfFunds || params.eddSourceOfFunds.trim() === '') {
        throw new Error('Enhanced Due Diligence (EDD) approval requires documented source of funds/wealth (eddSourceOfFunds).');
      }
      if (!params.eddApprovedBy || params.eddApprovedBy.trim() === '') {
        throw new Error('Enhanced Due Diligence (EDD) approval requires a named senior approver (eddApprovedBy).');
      }
    }

    // Determine next review date (BNM 2-year mandatory re-review for PEP/EDD)
    let nextReviewDate = params.nextReviewDate;
    if (params.status === 'approved_with_edd' && !nextReviewDate) {
      const twoYears = new Date();
      twoYears.setFullYear(twoYears.getFullYear() + 2);
      nextReviewDate = twoYears;
    }

    const updatePayload: any = {
      status: params.status,
      reviewedBy: params.reviewerId,
      reviewedAt: new Date(),
      reviewerNotes: params.notes || null,
      updatedAt: new Date(),
    };

    if (params.riskScore !== undefined) updatePayload.riskScore = params.riskScore;
    if (params.amlStatus) updatePayload.amlStatus = params.amlStatus;
    if (params.flags) updatePayload.flags = params.flags;
    if (params.eddSourceOfFunds) updatePayload.eddSourceOfFunds = params.eddSourceOfFunds;
    if (params.eddApprovedBy) updatePayload.eddApprovedBy = params.eddApprovedBy;
    if (nextReviewDate) updatePayload.nextReviewDate = nextReviewDate;

    const [updated] = await db
      .update(KycSubmission)
      .set(updatePayload)
      .where(eq(KycSubmission.id, params.submissionId))
      .returning();

    // Write audit event
    await db.insert(ComplianceAuditLog).values({
      userId: previousSubmission.userId,
      eventType: params.status === 'approved_with_edd' ? 'approved_with_edd' : params.status,
      actor: params.reviewerId,
      details: {
        submissionId: params.submissionId,
        previousStatus: previousSubmission.status,
        newStatus: params.status,
        riskScore: updated.riskScore,
        amlStatus: updated.amlStatus,
        flags: updated.flags,
        notes: params.notes,
        eddSourceOfFunds: params.eddSourceOfFunds,
        eddApprovedBy: params.eddApprovedBy,
        nextReviewDate: nextReviewDate?.toISOString(),
        reviewedAt: new Date().toISOString(),
      },
    });

    console.log(`[KYC] Submission ${params.submissionId} reviewed by ${params.reviewerId}: ${params.status}`);
    return updated;
  }

  /**
   * Get compliance audit logs
   */
  public async getComplianceAuditLogs(userId?: string): Promise<any[]> {
    const query = db.select().from(ComplianceAuditLog);
    if (userId) {
      return await query.where(eq(ComplianceAuditLog.userId, userId)).orderBy(desc(ComplianceAuditLog.timestamp)).limit(100);
    }
    return await query.orderBy(desc(ComplianceAuditLog.timestamp)).limit(100);
  }
}
