import express from 'express';
import { CreditcoinController } from './creditcoin.controller.js';

const creditcoinRoutes = express.Router();
const controller = new CreditcoinController();

// 1. Network status & configuration
creditcoinRoutes.get('/status', (req, res) => controller.getStatus(req, res));

// 2. Mint SAG Gold Collateral ERC-721 on Creditcoin 3
creditcoinRoutes.post('/collateral/mint', (req, res) => controller.mintCollateral(req, res));

// 3. Query on-chain collateral data
creditcoinRoutes.get('/collateral/:tokenId', (req, res) => controller.getCollateral(req, res));

// 4. Non-blocking Asynchronous Repayment Submission (Recommended)
creditcoinRoutes.post('/repayment/submit', (req, res) => controller.submitAsyncRepayment(req, res));

// 5. Polling endpoint for background repayment job status
creditcoinRoutes.get('/repayment/status/:jobId', (req, res) => controller.getRepaymentStatus(req, res));

// 6. Direct Synchronous Attestcoin Proof Relay (Fallback)
creditcoinRoutes.post('/repayment/verify-and-settle', (req, res) => controller.verifyAndSettleRepayment(req, res));

// 7. Immutable audit logs (replaces Hedera HCS topics)
creditcoinRoutes.get('/audit-logs', (req, res) => controller.getAuditLogs(req, res));

export { creditcoinRoutes };
export default creditcoinRoutes;
