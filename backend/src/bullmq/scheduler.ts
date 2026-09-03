import { Queue, Worker, Job } from 'bullmq';
import { processAsyncCreditcoinSag, AsyncCreditcoinSagJobData } from '../services/async-creditcoin-sag.service.js';
import { processGoldPriceJob, GoldPriceJobData } from '../services/async-gold-price.service.js';
import { processCrossChainProofJob, CrossChainProofJobData } from '../services/async-cross-chain-proof.service.js';

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
  SCHEDULER: 'creditcoin-scheduler-queue',
  PROVE_AND_SETTLE: 'prove-and-settle-queue',
} as const;

// Job types
export const JOB_TYPES = {
  CREATE_SAG: 'create-sag',
  FETCH_GOLD_PRICE: 'fetch-gold-price',
  PROVE_DEPOSIT: 'prove-deposit',
  PROVE_REPAYMENT: 'prove-repayment',
  PROVE_LOAN_FUNDING: 'prove-loan-funding',
  PROVE_PAWNSHOP_PAYMENT: 'prove-pawnshop-payment',
  PROVE_RETURN_DISTRIBUTION: 'prove-return-distribution',
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
 * Cross-Chain Proof & Settlement Queue
 * Attestcoin block attestation on CC3 takes between 30s to ~4 minutes under varying network load.
 * We configure 30 attempts with 10-second fixed backoff delay, establishing a deliberate ~5 minute
 * outer time bound for block height indexing before marking a job permanently failed.
 */
export const crossChainProofQueue = new Queue(QUEUE_NAMES.PROVE_AND_SETTLE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 30,
    backoff: {
      type: 'fixed',
      delay: 10000, // 10s between attestation polling retries
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

/**
 * Cross-chain proof & settlement worker
 */
export const crossChainProofWorker = new Worker(
  QUEUE_NAMES.PROVE_AND_SETTLE,
  async (job: Job<CrossChainProofJobData>) => {
    const { type, sourceTxHash } = job.data;
    console.log(`[${new Date().toISOString()}] [BullMQ] Starting cross-chain proof job #${job.id} (${type} / ${sourceTxHash.slice(0, 10)}...)`);
    try {
      const result = await processCrossChainProofJob(job);
      console.log(`[BullMQ] Cross-chain proof job #${job.id} completed successfully: ${result.transactionHash}`);
      return result;
    } catch (error: any) {
      console.error(`[BullMQ] Cross-chain proof job #${job.id} failed attempt ${job.attemptsMade}:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Worker error listeners
sagCreationWorker.on('failed', (job, err) => {
  console.error(`SAG creation job ${job?.id} failed:`, err);
});

goldPriceWorker.on('failed', (job, err) => {
  console.error(`Gold price job ${job?.id} failed:`, err);
});

crossChainProofWorker.on('failed', (job, err) => {
  console.error(`Cross-chain proof job ${job?.id} failed permanently after max attempts:`, err);
});