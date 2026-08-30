import { Router } from 'express';
import { CreditOracleController } from './credit-oracle.controller.js';

const router = Router();
const controller = new CreditOracleController();

router.post('/discover', controller.discoverWallet.bind(controller));
router.post('/fetch-proof', controller.fetchProof.bind(controller));
router.post('/prove-event', controller.proveAndScoreEvent.bind(controller));
router.post('/prove-repayment', controller.proveRepayment.bind(controller));
router.post('/prepare-pawnshop-proof', controller.preparePawnshopProof.bind(controller));
router.post('/prove-pawnshop-payment', controller.provePawnshopPayment.bind(controller));
router.get('/profile/:address', controller.getProfile.bind(controller));
router.get('/info', controller.getOracleInfo.bind(controller));

export default router;
