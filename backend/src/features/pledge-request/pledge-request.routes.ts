import express from 'express';
import { pledgeRequestController } from './pledge-request.controller.js';
import authenticateJWT from '@/middleware/authenticate-jwt.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', pledgeRequestController.create.bind(pledgeRequestController));
router.get('/mine', pledgeRequestController.getMine.bind(pledgeRequestController));
router.get('/my-loans', pledgeRequestController.getMyLoans.bind(pledgeRequestController));
router.get('/borrowers', pledgeRequestController.getBorrowers.bind(pledgeRequestController));
router.get('/borrowers/:borrowerId', pledgeRequestController.getBorrowerDetailById.bind(pledgeRequestController));
router.get('/pawnshops', pledgeRequestController.listPawnshops.bind(pledgeRequestController));
router.get('/:id', pledgeRequestController.getById.bind(pledgeRequestController));
router.patch('/:id/refresh-credit', pledgeRequestController.refreshCreditScore.bind(pledgeRequestController));
router.patch('/:id/accept', pledgeRequestController.accept.bind(pledgeRequestController));
router.patch('/:id/reject', pledgeRequestController.reject.bind(pledgeRequestController));

// V2: Physical verification, payment, and SAG minting
router.patch('/:id/verify-gold', pledgeRequestController.verifyGold.bind(pledgeRequestController));
router.patch('/:id/record-payment', pledgeRequestController.recordPayment.bind(pledgeRequestController));
router.patch('/:id/mint-sag', pledgeRequestController.mintSag.bind(pledgeRequestController));
router.post('/:id/repayment', pledgeRequestController.recordRepayment.bind(pledgeRequestController));
router.get('/:id/repayments', pledgeRequestController.getRepayments.bind(pledgeRequestController));

export { router as pledgeRequestRoutes };
