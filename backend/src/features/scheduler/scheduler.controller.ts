import { Request, Response } from 'express';
import { sagCreationQueue, goldPriceQueue, JOB_TYPES } from '../../bullmq/scheduler.js';

export class SchedulerController {
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const sagCount = await sagCreationQueue.count();
      const goldCount = await goldPriceQueue.count();

      res.status(200).json({
        success: true,
        data: {
          sagCreationQueue: { count: sagCount },
          goldPriceQueue: { count: goldCount },
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch queue stats' });
    }
  }

  async triggerGoldPriceFetch(req: Request, res: Response): Promise<void> {
    try {
      const job = await goldPriceQueue.add(JOB_TYPES.FETCH_GOLD_PRICE, { source: 'manual' });
      res.status(200).json({ success: true, message: 'Gold price job triggered', jobId: job.id });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to trigger gold price job' });
    }
  }
}

export const schedulerController = new SchedulerController();
