import express from 'express';
import axios from 'axios';

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
import { notificationRoutes } from '@/features/notification/notification.routes.js';

const v1Router = express.Router();

// Public Creditcoin & Attestcoin Protocol Routes (Verification & Settlement)
v1Router.use('/creditcoin', creditcoinRoutes);
v1Router.use('/credit-oracle', creditOracleRoutes);
v1Router.post('/loan/repay/prove', (req, res) => new CreditOracleController().proveRepayment(req, res));
v1Router.post('/investor/deposit/prove', (req, res) => investorController.proveDeposit(req, res));

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

// Borrower-to-Pawnshop Pledge Requests
v1Router.use('/pledge-requests', pledgeRequestRoutes);

// Notifications
v1Router.use('/notifications', notificationRoutes);

// RBAC & Admin routes
v1Router.use('/rbac', rbacRoutes);

// Scheduler & queue management
v1Router.use('/scheduler', schedulerRoutes);

// ETH/USD price from CoinGecko
v1Router.get('/eth-price', async (_req, res) => {
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { timeout: 5000 });
    res.json({ success: true, data: { usd: data.ethereum?.usd || 0 } });
  } catch {
    res.json({ success: true, data: { usd: 4500 } });
  }
});

export default v1Router;
