import { Request, Response } from 'express';
import { getUserDataByToken } from '../auth/auth.repository.js';
import { CreatePawnshopProfileSchema } from './pawnshop-profile.model.js';
import {
  createPawnshopProfile,
  getPawnshopProfileByUserId,
  updatePawnshopProfile,
  getAllPawnshopProfiles,
  getPawnshopProfilesByKycStatus,
  updatePawnshopKycStatus,
} from './pawnshop-profile.repository.js';

function getToken(req: Request): string {
  return req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.headers.authorization || '';
}

export class PawnshopProfileController {
  /**
   * POST /pawnshop/profile — Create or update pawnshop business profile
   */
  async upsert(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== 'PAWNSHOP') {
        res.status(403).json({ success: false, error: 'Only pawnshops can manage profiles' });
        return;
      }

      const parsed = CreatePawnshopProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: parsed.error.issues[0].message });
        return;
      }

      const existing = await getPawnshopProfileByUserId(user.userId!);
      if (existing) {
        const updated = await updatePawnshopProfile(user.userId!, parsed.data as any);
        res.status(200).json({ success: true, data: updated });
      } else {
        const profile = await createPawnshopProfile({
          userId: user.userId!,
          walletAddress: user.accountId,
          ...parsed.data,
        } as any);
        res.status(201).json({ success: true, data: profile });
      }
    } catch (error) {
      console.error('Error upserting pawnshop profile:', error);
      res.status(500).json({ success: false, error: 'Failed to save profile' });
    }
  }

  /**
   * GET /pawnshop/profile — Get current pawnshop's profile
   */
  async getMine(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const profile = await getPawnshopProfileByUserId(user.userId!);
      if (!profile) {
        res.status(200).json({ success: true, data: null, message: 'No profile yet' });
        return;
      }

      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      console.error('Error fetching pawnshop profile:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  }

  /**
   * PATCH /pawnshop/profile — Update current pawnshop's profile
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || user.roleId !== 'PAWNSHOP') {
        res.status(403).json({ success: false, error: 'Only pawnshops can update profiles' });
        return;
      }

      const allowedFields = [
        'businessName', 'businessRegistrationNo', 'licenseNumber', 'licenseExpiry',
        'businessType', 'yearEstablished', 'numberOfEmployees', 'branchCount',
        'businessPhone', 'businessEmail', 'website',
        'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
        'latitude', 'longitude', 'operatingHours', 'servicesOffered',
        'kycStatus', 'kycRejectionReason', 'documents',
      ];
      const filtered: Record<string, any> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) filtered[key] = req.body[key];
      }

      const updated = await updatePawnshopProfile(user.userId!, filtered);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Profile not found' });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating pawnshop profile:', error instanceof Error ? error.message : error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }

  /**
   * GET /pawnshop/profiles — List all active pawnshop profiles (public, for borrowers)
   */
  async listAll(_req: Request, res: Response): Promise<void> {
    try {
      const profiles = await getAllPawnshopProfiles();
      const active = profiles.filter(p => p.status === 'active');
      res.status(200).json({ success: true, data: active });
    } catch (error) {
      console.error('Error listing pawnshop profiles:', error);
      res.status(500).json({ success: false, error: 'Failed to list profiles' });
    }
  }

  /**
   * GET /pawnshop/profiles/:userId — Get a specific pawnshop's profile (public)
   */
  async getByUserId(req: Request, res: Response): Promise<void> {
    try {
      const profile = await getPawnshopProfileByUserId(req.params.userId as string);
      if (!profile) {
        res.status(404).json({ success: false, error: 'Profile not found' });
        return;
      }
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      console.error('Error fetching pawnshop profile:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  }

  /**
   * GET /pawnshop/admin/pawnshops — Admin: List all pawnshop profiles
   */
  async adminListPawnshops(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user.roleId || '')) {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const profiles = await getAllPawnshopProfiles();
      res.status(200).json({ success: true, data: profiles });
    } catch (error) {
      console.error('Error listing pawnshops for admin:', error);
      res.status(500).json({ success: false, error: 'Failed to list pawnshops' });
    }
  }

  /**
   * GET /pawnshop/admin/pawnshops/pending — Admin: List pawnshops with pending KYC
   */
  async adminListPendingPawnshops(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user.roleId || '')) {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const pending = await getPawnshopProfilesByKycStatus('pending');
      res.status(200).json({ success: true, data: pending });
    } catch (error) {
      console.error('Error listing pending pawnshops:', error);
      res.status(500).json({ success: false, error: 'Failed to list pending pawnshops' });
    }
  }

  /**
   * POST /pawnshop/admin/pawnshops/:userId/kyc — Admin: Approve or reject pawnshop KYC
   */
  async adminReviewPawnshopKyc(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(user.roleId || '')) {
        res.status(403).json({ success: false, error: 'Admin access required' });
        return;
      }

      const { userId } = req.params;
      const { action, rejectionReason } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        res.status(400).json({ success: false, error: 'Action must be "approve" or "reject"' });
        return;
      }

      if (action === 'reject' && !rejectionReason) {
        res.status(400).json({ success: false, error: 'Rejection reason is required' });
        return;
      }

      const profile = await getPawnshopProfileByUserId(userId);
      if (!profile) {
        res.status(404).json({ success: false, error: 'Pawnshop profile not found' });
        return;
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updated = await updatePawnshopKycStatus(userId, newStatus, rejectionReason);

      res.status(200).json({
        success: true,
        data: updated,
        message: `Pawnshop KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      console.error('Error reviewing pawnshop KYC:', error);
      res.status(500).json({ success: false, error: 'Failed to review pawnshop KYC' });
    }
  }

  /**
   * GET /pawnshop/stats — Get dashboard stats for current pawnshop
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const token = getToken(req);
      const user = await getUserDataByToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { pool } = await import('@/db/index.js');

      // Count SAGs
      const sagResult = await pool.query(
        `SELECT
           COUNT(*) as "totalSags",
           COUNT(*) FILTER (WHERE status = 'active') as "activeSags",
           COALESCE(SUM((sag_properties->>'valuation')::numeric), 0) as "totalValuation"
         FROM main.sag WHERE original_owner = $1`,
        [user.accountId]
      );

      // Count pledge requests
      const pledgeResult = await pool.query(
        `SELECT
           COUNT(*) as "totalRequests",
           COUNT(*) FILTER (WHERE status = 'pending') as "pendingRequests",
           COUNT(*) FILTER (WHERE status = 'accepted') as "acceptedRequests",
           COUNT(*) FILTER (WHERE status = 'completed') as "completedRequests"
         FROM main.pledge_request WHERE pawnshop_id = $1`,
        [user.userId]
      );

      const sag = sagResult.rows[0];
      const pledge = pledgeResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          totalSags: Number(sag.totalSags),
          activeSags: Number(sag.activeSags),
          totalValuation: Number(sag.totalValuation),
          totalRequests: Number(pledge.totalRequests),
          pendingRequests: Number(pledge.pendingRequests),
          acceptedRequests: Number(pledge.acceptedRequests),
          completedRequests: Number(pledge.completedRequests),
        },
      });
    } catch (error) {
      console.error('Error fetching pawnshop stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  }
}

export const pawnshopProfileController = new PawnshopProfileController();
