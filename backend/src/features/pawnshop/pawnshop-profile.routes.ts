import express from 'express';
import { pawnshopProfileController } from './pawnshop-profile.controller.js';
import authenticateJWT from '@/middleware/authenticate-jwt.js';

const router = express.Router();

// Public routes
router.get('/profiles', pawnshopProfileController.listAll.bind(pawnshopProfileController));
router.get('/profiles/:userId', pawnshopProfileController.getByUserId.bind(pawnshopProfileController));

// Protected routes (pawnshop only)
router.use(authenticateJWT);
router.post('/profile', pawnshopProfileController.upsert.bind(pawnshopProfileController));
router.get('/profile', pawnshopProfileController.getMine.bind(pawnshopProfileController));
router.patch('/profile', pawnshopProfileController.update.bind(pawnshopProfileController));
router.get('/stats', pawnshopProfileController.getStats.bind(pawnshopProfileController));

export { router as pawnshopProfileRoutes };
