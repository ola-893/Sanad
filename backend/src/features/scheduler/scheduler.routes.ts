import { Router } from 'express';
import { schedulerController } from './scheduler.controller.js';

const router = Router();

router.get('/stats', schedulerController.getQueueStats.bind(schedulerController));
router.post('/trigger-gold-price', schedulerController.triggerGoldPriceFetch.bind(schedulerController));

export default router;
