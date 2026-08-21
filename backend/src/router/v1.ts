import express from 'express';

// Import feature routes
import { authRoutes } from '@/features/auth/index.js';
import { healthRoutes } from '@/features/health/index.js';
import { handleUpload } from '@/features/upload/index.js';
import { sagRoutes } from '@/features/sag/index.js';
import { investorRoutes, investorController } from '@/features/investor/index.js';
import { pawnshopRoutes, pawnshopProfileRoutes } from '@/features/pawnshop/index.js';
import { goldPriceRoutes } from '@/features/gold-price/index.js';
import authenticateJWT from '@/middleware/authenticate-jwt.js';
import uploadRoutes from '@/features/upload/upload.routes.js';
import { creditcoinRoutes } from '@/features/creditcoin/index.js';
import { kycRoutes } from '@/features/kyc/index.js';
import rbacRoutes from '@/features/rbac/rbac.routes.js';
import schedulerRoutes from '@/features/scheduler/scheduler.routes.js';
import { creditOracleRoutes, CreditOracleController } from '@/core/credit-bureau/index.js';
import { pledgeRequestRoutes } from '@/features/pledge-request/index.js';

const v1Router = express.Router();

// Use the feature routes
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/upload', uploadRoutes);
v1Router.use('/kyc', kycRoutes);
v1Router.use('/sag', sagRoutes);
v1Router.use('/investor', authenticateJWT, investorRoutes);
v1Router.use('/pawnshop', pawnshopProfileRoutes);
v1Router.use('/pawnshop', authenticateJWT, pawnshopRoutes);
v1Router.use('/gold-price', goldPriceRoutes);

// Creditcoin & Attestcoin Protocol Routes
v1Router.use('/creditcoin', creditcoinRoutes);
v1Router.use('/credit-oracle', creditOracleRoutes);
v1Router.post('/loan/repay/prove', (req, res) => new CreditOracleController().proveRepayment(req, res));
v1Router.post('/investor/deposit/prove', (req, res) => investorController.proveDeposit(req, res));

// Borrower-to-Pawnshop Pledge Requests
v1Router.use('/pledge-requests', pledgeRequestRoutes);

// RBAC & Admin routes
v1Router.use('/rbac', rbacRoutes);

// Scheduler & queue management
v1Router.use('/scheduler', schedulerRoutes);

export default v1Router;
