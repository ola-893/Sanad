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
const creditOracleCtrl = new CreditOracleController();
v1Router.post('/loan/repay/prove', (req, res) => creditOracleCtrl.proveRepayment(req, res));
v1Router.get('/loan/repay/status/:jobId', (req, res) => creditOracleCtrl.getProofStatus(req, res));
v1Router.post('/loan/fund/prove', (req, res) => creditOracleCtrl.proveLoanFunding(req, res));
v1Router.get('/loan/fund/status/:jobId', (req, res) => creditOracleCtrl.getProofStatus(req, res));
v1Router.post('/investor/deposit/prove', (req, res) => investorController.proveDeposit(req, res));
v1Router.get('/investor/deposit/status/:jobId', (req, res) => investorController.getDepositStatus(req, res));
v1Router.get('/proof/status/:jobId', (req, res) => creditOracleCtrl.getProofStatus(req, res));

// Investor Return Distribution (reuses proof status for job polling)
v1Router.get('/loan/return/status/:jobId', (req, res) => creditOracleCtrl.getProofStatus(req, res));
v1Router.get('/investor/returns/:walletAddress', async (req, res) => {
  try {
    const { getLoanReturnsByInvestor } = await import('@/features/loan-return/loan-return.repository.js');
    const returns = await getLoanReturnsByInvestor(req.params.walletAddress);
    res.json({ success: true, data: returns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
v1Router.get('/pawnshop/returns/:walletAddress', async (req, res) => {
  try {
    const { getLoanReturnsByPawnshop } = await import('@/features/loan-return/loan-return.repository.js');
    const returns = await getLoanReturnsByPawnshop(req.params.walletAddress);
    res.json({ success: true, data: returns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// ETH/USD price from CoinGecko with cached fallback
let lastEthPrice = 0
let lastEthPriceTime = 0

v1Router.get('/eth-price', async (_req, res) => {
  // Return cached price if fresh (< 60s)
  if (lastEthPrice > 0 && (Date.now() - lastEthPriceTime) < 60 * 1000) {
    res.json({ success: true, data: { usd: lastEthPrice } })
    return
  }

  // Source 1: CoinGecko
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { timeout: 5000 });
    const price = data.ethereum?.usd
    if (price && price > 0) {
      lastEthPrice = price
      lastEthPriceTime = Date.now()
      res.json({ success: true, data: { usd: price } })
      return
    }
  } catch {}

  // Source 2: Binance public API
  try {
    const { data } = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', { timeout: 5000 });
    const price = parseFloat(data?.price)
    if (price && price > 0) {
      lastEthPrice = price
      lastEthPriceTime = Date.now()
      res.json({ success: true, data: { usd: price } })
      return
    }
  } catch {}

  // Source 3: CoinCap
  try {
    const { data } = await axios.get('https://api.coincap.io/v2/assets/ethereum', { timeout: 5000 });
    const price = parseFloat(data?.data?.priceUsd)
    if (price && price > 0) {
      lastEthPrice = price
      lastEthPriceTime = Date.now()
      res.json({ success: true, data: { usd: price } })
      return
    }
  } catch {}

  // Fallback: return last known price if < 10 min old, otherwise 0
  const isRecent = lastEthPrice > 0 && (Date.now() - lastEthPriceTime) < 10 * 60 * 1000
  res.json({ success: true, data: { usd: isRecent ? lastEthPrice : 0 } })
});

export default v1Router;
