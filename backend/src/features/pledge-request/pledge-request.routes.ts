import express from 'express';
import { pledgeRequestController } from './pledge-request.controller.js';
import authenticateJWT from '@/middleware/authenticate-jwt.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/', pledgeRequestController.create.bind(pledgeRequestController));
router.get('/mine', pledgeRequestController.getMine.bind(pledgeRequestController));
router.get('/pawnshops', pledgeRequestController.listPawnshops.bind(pledgeRequestController));
router.get('/:id', pledgeRequestController.getById.bind(pledgeRequestController));
router.patch('/:id/accept', pledgeRequestController.accept.bind(pledgeRequestController));
router.patch('/:id/reject', pledgeRequestController.reject.bind(pledgeRequestController));

export { router as pledgeRequestRoutes };
