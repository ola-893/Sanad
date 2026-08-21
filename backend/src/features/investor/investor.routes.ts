import express from 'express';
import { InvestorController } from './investor.controller.js';

const router = express.Router();
const investorController = new InvestorController();

router.get('/pool-stats', investorController.getPoolStats.bind(investorController));
router.get('/pool/data', investorController.getPoolStats.bind(investorController));
router.get('/nfts', investorController.getInvestorNFTInfo.bind(investorController));
router.get('/wallet/balance', investorController.getInvestorWalletBalance.bind(investorController));

export { router as investorRoutes };
