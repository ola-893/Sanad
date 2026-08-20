import express from 'express';
import { kycController } from './kyc.controller.js';
import authenticateJWT from '@/middleware/authenticate-jwt.js';

const router = express.Router();

/**
 * Public/User KYC Endpoints
 */
// Submit KYC (form + document paths)
router.post('/submit', (req, res) => kycController.submitKyc(req, res));

// Check KYC status by User ID
router.get('/status/:userId', (req, res) => kycController.getKycStatus(req, res));

/**
 * Compliance Officer / Admin Endpoints
 */
// Get pending KYC queue
router.get('/pending', (req, res) => kycController.getPendingKyc(req, res));

// Get all KYC submissions (optional ?status= filter)
router.get('/all', (req, res) => kycController.getAllKyc(req, res));

// Review KYC submission (approve, reject, approve_with_edd)
router.post('/:id/review', (req, res) => kycController.reviewKyc(req, res));

// Audit trail for compliance
router.get('/audit-logs', (req, res) => kycController.getAuditLogs(req, res));

export default router;
export { router as kycRoutes };
