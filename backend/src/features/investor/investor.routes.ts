import express from 'express';
import { InvestorController } from './investor.controller.js';

const router = express.Router();
const investorController = new InvestorController();

router.get('/pool-stats', investorController.getPoolStats.bind(investorController));
router.get('/pool/data', investorController.getPoolStats.bind(investorController));
router.get('/nfts', investorController.getInvestorNFTInfo.bind(investorController));
router.get('/wallet/balance', investorController.getInvestorWalletBalance.bind(investorController));
router.post('/deposit/prove', investorController.proveDeposit.bind(investorController));
router.get('/deposit/status/:jobId', investorController.getDepositStatus.bind(investorController));
router.post('/invest', investorController.recordInvestment.bind(investorController));
router.get('/investments', investorController.getInvestments.bind(investorController));

export { router as investorRoutes };
