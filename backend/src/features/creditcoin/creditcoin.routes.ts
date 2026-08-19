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

// 4. Compliance controls (Role-gated freeze, unfreeze, and administrative wipe)
creditcoinRoutes.post('/compliance/freeze', (req, res) => controller.complianceFreeze(req, res));
creditcoinRoutes.post('/compliance/unfreeze', (req, res) => controller.complianceUnfreeze(req, res));
creditcoinRoutes.post('/compliance/wipe', (req, res) => controller.complianceWipe(req, res));
creditcoinRoutes.get('/compliance/status', (req, res) => controller.getComplianceStatus(req, res));

// 5. Immutable audit logs on Creditcoin CC3
creditcoinRoutes.get('/audit-logs', (req, res) => controller.getAuditLogs(req, res));
creditcoinRoutes.post('/audit-logs', (req, res) => controller.createAuditLog(req, res));

export { creditcoinRoutes };
export default creditcoinRoutes;
