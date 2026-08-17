import { Queue, Worker, Job } from 'bullmq';
import { processAsyncCreditcoinSag, AsyncCreditcoinSagJobData } from '../services/async-creditcoin-sag.service.js';
import { processGoldPriceJob, GoldPriceJobData } from '../services/async-gold-price.service.js';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Queue names
export const QUEUE_NAMES = {
  SAG_CREATION: 'sag-creation-queue',
  GOLD_PRICE: 'gold-price-queue',
  SCHEDULER: 'creditcoin-scheduler-queue'
} as const;

// Job types
export const JOB_TYPES = {
  CREATE_SAG: 'create-sag',
  FETCH_GOLD_PRICE: 'fetch-gold-price'
} as const;

// Create queues
export const sagCreationQueue = new Queue(QUEUE_NAMES.SAG_CREATION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export const goldPriceQueue = new Queue(QUEUE_NAMES.GOLD_PRICE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 30,
    removeOnFail: 15,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * SAG creation processor worker on Creditcoin CC3
 */
export const sagCreationWorker = new Worker(
  QUEUE_NAMES.SAG_CREATION,
  async (job: Job<AsyncCreditcoinSagJobData>) => {
    const { sagData, userId } = job.data;
    console.log(`[${new Date().toISOString()}] Processing async Creditcoin SAG creation for ${sagData.sagName} by user ${userId}`);
    
    try {
      const result = await processAsyncCreditcoinSag(job);
      console.log(`Async Creditcoin SAG creation completed for ${sagData.sagName}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.error(`Error processing async SAG creation for ${sagData.sagName}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

/**
 * Gold price processor worker
 */
export const goldPriceWorker = new Worker(
  QUEUE_NAMES.GOLD_PRICE,
  async (job: Job<GoldPriceJobData>) => {
    console.log(`[${new Date().toISOString()}] Processing gold price fetch job`);
    try {
      const result = await processGoldPriceJob(job);
      return result;
    } catch (error) {
      console.error('Error processing gold price job:', error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

// Worker error listeners
sagCreationWorker.on('failed', (job, err) => {
  console.error(`SAG creation job ${job?.id} failed:`, err);
});

goldPriceWorker.on('failed', (job, err) => {
  console.error(`Gold price job ${job?.id} failed:`, err);
});