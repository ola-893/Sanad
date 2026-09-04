import { Request, Response } from 'express';
import { DefiDiscoveryService } from './defi-discovery.service.js';
import { AttestcoinOracleRelayerService } from './attestcoin-oracle-relayer.service.js';
import { CREDITCOIN_CONFIG } from '@/features/creditcoin/creditcoin.config.js';

export class CreditOracleController {
  private discoveryService: DefiDiscoveryService;
  private relayerService: AttestcoinOracleRelayerService;

  constructor() {
    this.discoveryService = new DefiDiscoveryService();
    this.relayerService = new AttestcoinOracleRelayerService();
  }

  /**
   * POST /api/credit-oracle/discover
   * Scans Ethereum Mainnet DeFi activity for an address
   */
  public async discoverWallet(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.body;
      if (!address || typeof address !== 'string' || !address.startsWith('0x') || address.length !== 42) {
        res.status(400).json({ success: false, message: 'Valid Ethereum wallet address required (0x...)' });
        return;
      }

      const result = await this.discoveryService.discoverWalletEvents(address);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[CreditOracleController] discoverWallet error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to discover wallet DeFi history' });
    }
  }

  /**
   * POST /api/credit-oracle/prove-event
   * Generates Attestcoin proof and writes credit record to SanadCreditOracle on CC3
   */
  public async proveAndScoreEvent(req: Request, res: Response): Promise<void> {
    try {
      const { address, event, signature } = req.body;
      if (!address || !event || !event.sourceTxHash) {
        res.status(400).json({ success: false, message: 'address and event object with sourceTxHash are required' });
        return;
      }

      const result = await this.relayerService.proveAndRecordEvent(address, event, signature);
      if (!result.success) {
        res.status(500).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[CreditOracleController] proveAndScoreEvent error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to prove and record event' });
    }
  }

  // In-memory progress tracker for auto-prove jobs
  private autoProveJobs = new Map<string, {
    address: string;
    status: 'discovering' | 'proving' | 'completed' | 'error';
    eventsFound: number;
    eventsProven: number;
    eventsFailed: number;
    total: number;
    current: number;
    results: any[];
    startedAt: number;
    completedAt?: number;
    error?: string;
  }>();

  /**
   * POST /api/credit-oracle/auto-prove-all
   * Discovers all DeFi events and starts proving in background.
   * Returns immediately with a jobId. Frontend polls GET /auto-prove-status/:address.
   */
  public async autoProveAll(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.body;
      if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid wallet address required' });
        return;
      }

      // If already running, return current status
      const existing = this.autoProveJobs.get(address.toLowerCase());
      if (existing && (existing.status === 'discovering' || existing.status === 'proving')) {
        res.status(200).json({
          success: true,
          data: { address, status: existing.status, eventsFound: existing.eventsFound, eventsProven: existing.eventsProven, eventsFailed: existing.eventsFailed, total: existing.total, current: existing.current },
        });
        return;
      }

      // Create job entry
      const job = {
        address: address.toLowerCase(),
        status: 'discovering' as const,
        eventsFound: 0,
        eventsProven: 0,
        eventsFailed: 0,
        total: 0,
        current: 0,
        results: [] as any[],
        startedAt: Date.now(),
      };
      this.autoProveJobs.set(address.toLowerCase(), job);

      // Return immediately — proving happens in background
      res.status(200).json({
        success: true,
        data: { address, status: 'discovering', eventsFound: 0, eventsProven: 0, eventsFailed: 0, total: 0, current: 0 },
      });

      // Start background proving
      this.runAutoProveJob(address, job).catch(err => {
        console.error(`[CreditOracle] Auto-prove background error for ${address}:`, err.message);
        job.status = 'error';
        job.error = err.message;
        job.completedAt = Date.now();
      });
    } catch (err: any) {
      console.error('[CreditOracleController] autoProveAll error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to start auto-prove' });
    }
  }

  private async runAutoProveJob(address: string, job: any): Promise<void> {
    console.log(`[CreditOracle] Auto-proving all DeFi events for ${address}`);

    // 1. Discover events
    const discovery = await this.discoveryService.discoverWalletEvents(address);
    if (!discovery.events || discovery.events.length === 0) {
      job.status = 'completed';
      job.eventsFound = 0;
      job.completedAt = Date.now();
      console.log(`[CreditOracle] No DeFi events found for ${address}`);
      return;
    }
    job.eventsFound = discovery.events.length;

    // 2. Get already-proven events to skip
    let alreadyProven = new Set<string>();
    try {
      const profile = await this.relayerService.getOnChainCreditProfile(address);
      if (profile.provenEvents) {
        for (const pe of profile.provenEvents) {
          if (pe.sourceTxHash) alreadyProven.add(pe.sourceTxHash.toLowerCase());
        }
      }
    } catch {}

    // Also check DB
    try {
      const { ProvenEvents } = await import('@/db/schema.js');
      const { db } = await import('@/db/index.js');
      const { eq } = await import('drizzle-orm');
      const dbEvents = await db.select().from(ProvenEvents).where(eq(ProvenEvents.borrowerAddress, address));
      for (const de of dbEvents) {
        if (de.sourceTxHash) alreadyProven.add(de.sourceTxHash.toLowerCase());
      }
    } catch {}

    // 3. Filter to unproven events only
    const unprovenEvents = discovery.events.filter((e: any) => !alreadyProven.has((e.sourceTxHash || '').toLowerCase()));

    if (unprovenEvents.length === 0) {
      job.status = 'completed';
      job.completedAt = Date.now();
      console.log(`[CreditOracle] All ${discovery.events.length} events already proven for ${address}`);
      return;
    }

    console.log(`[CreditOracle] Found ${unprovenEvents.length} unproven events out of ${discovery.events.length} total`);
    job.status = 'proving';
    job.total = unprovenEvents.length;

    // 4. Prove each event sequentially
    for (const event of unprovenEvents) {
      job.current++;
      try {
        console.log(`[CreditOracle] Proving event ${job.current}/${job.total}: ${event.eventType} on ${event.protocol} (${event.sourceTxHash?.slice(0, 14)}...)`);
        const result = await this.relayerService.proveAndRecordEvent(address, event);
        job.results.push({
          sourceTxHash: event.sourceTxHash,
          protocol: event.protocol,
          eventType: event.eventType,
          success: result.success,
          cc3TxHash: result.transactionHash || null,
          error: result.error || null,
        });
        if (result.success) {
          job.eventsProven++;
          console.log(`[CreditOracle] ✓ Proved ${event.eventType} — CC3: ${result.transactionHash?.slice(0, 14)}`);
        } else {
          job.eventsFailed++;
          console.warn(`[CreditOracle] ✗ Failed ${event.eventType}: ${result.error}`);
        }
      } catch (err: any) {
        job.eventsFailed++;
        job.results.push({
          sourceTxHash: event.sourceTxHash,
          protocol: event.protocol,
          eventType: event.eventType,
          success: false,
          error: err.message,
        });
        console.warn(`[CreditOracle] ✗ Exception proving ${event.eventType}: ${err.message}`);
      }
    }

    job.status = 'completed';
    job.completedAt = Date.now();
    console.log(`[CreditOracle] Auto-prove complete for ${address}: ${job.eventsProven}/${job.total} proven, ${job.eventsFailed} failed`);
  }

  /**
   * GET /api/credit-oracle/auto-prove-status/:address
   * Poll auto-prove job progress
   */
  public async getAutoProveStatus(req: Request, res: Response): Promise<void> {
    try {
      const address = req.params.address?.toLowerCase();
      if (!address || !address.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid wallet address required' });
        return;
      }
      const job = this.autoProveJobs.get(address);
      if (!job) {
        res.status(200).json({ success: true, data: { status: 'idle', eventsFound: 0, eventsProven: 0, eventsFailed: 0, total: 0, current: 0 } });
        return;
      }
      res.status(200).json({
        success: true,
        data: {
          status: job.status,
          eventsFound: job.eventsFound,
          eventsProven: job.eventsProven,
          eventsFailed: job.eventsFailed,
          total: job.total,
          current: job.current,
          elapsed: job.completedAt ? job.completedAt - job.startedAt : Date.now() - job.startedAt,
          error: job.error,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/credit-oracle/fetch-proof
   * Fetches Attestcoin proof for an Ethereum Mainnet tx WITHOUT submitting to CC3.
   */
  public async fetchProof(req: Request, res: Response): Promise<void> {
    const { sourceTxHash, blockHeight, chainKey } = req.body;
    if (!sourceTxHash || typeof sourceTxHash !== 'string' || !sourceTxHash.startsWith('0x')) {
      res.status(400).json({ success: false, message: 'Valid sourceTxHash required (0x...)' });
      return;
    }

    // Allow overriding chainKey per-request (1 = Sepolia, 3 = Mainnet)
    const originalChainKey = this.relayerService.sourceChainKey;
    if (chainKey) {
      this.relayerService.sourceChainKey = Number(chainKey);
    }

    try {
      const result = await this.relayerService.fetchProof(sourceTxHash, blockHeight);
      if (!result.success) {
        res.status(500).json({ success: false, message: result.error });
        return;
      }
      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      console.error('[CreditOracleController] fetchProof error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch proof' });
    } finally {
      // Always restore original chain key
      this.relayerService.sourceChainKey = originalChainKey;
    }
  }

  /**
   * GET /api/credit-oracle/profile/:address
   * Fetches on-chain CreditProfile and proven events from CC3
   */
  public async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const addressParam = req.params.address;
      const address = typeof addressParam === 'string' ? addressParam : String(addressParam || '');
      if (!address || !address.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid wallet address required' });
        return;
      }

      const profile = await this.relayerService.getOnChainCreditProfile(address);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err: any) {
      console.error('[CreditOracleController] getProfile error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to fetch on-chain credit profile' });
    }
  }

  /**
   * GET /api/credit-oracle/oracle-info
   * Returns Attestcoin oracle deployment details
   */
  public async getOracleInfo(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        oracleAddress: this.relayerService.getOracleAddress(),
        network: 'Creditcoin 3 Testnet',
        chainId: 102031,
        sourceChain: 'Ethereum Sepolia (Chain Key: 1) — Mainnet supported via chainKey override',
        blockProverPrecompile: '0x0000000000000000000000000000000000000FD2',
        chainInfoPrecompile: '0x0000000000000000000000000000000000000fD3',
        proofApiUrl: CREDITCOIN_CONFIG.proofBuilderUrl,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/address/${this.relayerService.getOracleAddress()}`,
      }
    });
  }

  /**
   * POST /api/v1/credit-oracle/prepare-pawnshop-proof
   * Returns unsigned CC3 transaction data for MetaMask to sign
   */
  public async preparePawnshopProof(req: Request, res: Response): Promise<void> {
    try {
      const { sourceTxHash, chainKey, borrowerAddress } = req.body;
      if (!sourceTxHash || typeof sourceTxHash !== 'string' || !sourceTxHash.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid sourceTxHash required' });
        return;
      }

      const result = await this.relayerService.preparePawnshopProof(
        sourceTxHash,
        chainKey ? Number(chainKey) : 1,
        borrowerAddress,
      );

      if (!result.success) {
        res.status(500).json({ success: false, message: result.error });
        return;
      }

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/credit-oracle/prove-pawnshop-payment
   * Proves a pawnshop-to-borrower ETH payment on CC3 via Attestcoin BlockProver (Async BullMQ)
   */
  public async provePawnshopPayment(req: Request, res: Response): Promise<void> {
    try {
      const { sourceTxHash, chainKey, borrowerAddress } = req.body;
      if (!sourceTxHash || typeof sourceTxHash !== 'string' || !sourceTxHash.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid sourceTxHash required (0x...)' });
        return;
      }

      const { crossChainProofQueue, JOB_TYPES } = await import('@/bullmq/scheduler.js');
      const jobId = `pawnshop-pay-${sourceTxHash.toLowerCase()}`;

      const existingJob = await crossChainProofQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state !== 'failed') {
          res.status(202).json({
            success: true,
            message: 'Pawnshop payment proof job already active or completed',
            data: {
              jobId: existingJob.id,
              status: state.toUpperCase(),
              statusUrl: `/api/v1/credit-oracle/proof/status/${existingJob.id}`,
            },
          });
          return;
        }
        await existingJob.remove();
      }

      console.log(`[${new Date().toISOString()}] Enqueuing pawnshop payment proof job ${jobId} for sourceTx ${sourceTxHash}`);

      const job = await crossChainProofQueue.add(
        JOB_TYPES.PROVE_PAWNSHOP_PAYMENT,
        {
          type: 'pawnshop-payment',
          sourceTxHash,
          chainKey: chainKey ? Number(chainKey) : 1,
          borrowerAddress,
        },
        {
          jobId,
          priority: 1,
        }
      );

      res.status(202).json({
        success: true,
        message: 'Pawnshop payment proof job queued successfully on Creditcoin CC3',
        data: {
          jobId: job.id,
          status: 'QUEUED',
          statusUrl: `/api/v1/credit-oracle/proof/status/${job.id}`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[CreditOracleController] provePawnshopPayment error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to queue pawnshop payment proof' });
    }
  }

  /**
   * POST /api/v1/credit-oracle/prove-loan-funding OR /api/v1/loan/fund/prove
   * Cryptographically verifies an Ethereum Sepolia loan funding tx and settles on CC3 (Async BullMQ)
   */
  public async proveLoanFunding(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, txHash, sourceTxHash, chainKey } = req.body;
      const targetHash = txHash || sourceTxHash;

      if (!tokenId || !targetHash) {
        res.status(400).json({
          success: false,
          message: 'tokenId and txHash (or sourceTxHash) are required'
        });
        return;
      }

      const { crossChainProofQueue, JOB_TYPES } = await import('@/bullmq/scheduler.js');
      const jobId = `fund-${Number(tokenId)}-${targetHash.toLowerCase()}`;

      const existingJob = await crossChainProofQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state !== 'failed') {
          res.status(202).json({
            success: true,
            message: 'Loan funding proof job already active or completed',
            data: {
              jobId: existingJob.id,
              status: state.toUpperCase(),
              statusUrl: `/api/v1/credit-oracle/proof/status/${existingJob.id}`,
            },
          });
          return;
        }
        await existingJob.remove();
      }

      console.log(`[${new Date().toISOString()}] Enqueuing loan funding proof job ${jobId} for Token #${tokenId}, sourceTx ${targetHash}`);

      const job = await crossChainProofQueue.add(
        JOB_TYPES.PROVE_LOAN_FUNDING,
        {
          type: 'loan-funding',
          sourceTxHash: targetHash,
          tokenId: Number(tokenId),
          chainKey: chainKey ? Number(chainKey) : 1,
        },
        {
          jobId,
          priority: 1,
        }
      );

      res.status(202).json({
        success: true,
        message: 'Loan funding proof job queued successfully on Creditcoin CC3',
        data: {
          jobId: job.id,
          status: 'QUEUED',
          statusUrl: `/api/v1/credit-oracle/proof/status/${job.id}`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[CreditOracleController] proveLoanFunding error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to queue loan funding proof'
      });
    }
  }

  /**
   * POST /api/v1/credit-oracle/prove-repayment OR /api/v1/loan/repay/prove
   * Cryptographically verifies an Ethereum Sepolia repayment tx and settles the loan on CC3 (Async BullMQ)
   */
  public async proveRepayment(req: Request, res: Response): Promise<void> {
    try {
      const { tokenId, txHash, sourceTxHash, chainKey } = req.body;
      const targetHash = txHash || sourceTxHash;

      if (!tokenId || !targetHash) {
        res.status(400).json({
          success: false,
          message: 'tokenId and txHash (or sourceTxHash) are required'
        });
        return;
      }

      const { crossChainProofQueue, JOB_TYPES } = await import('@/bullmq/scheduler.js');
      const jobId = `repay-${Number(tokenId)}-${targetHash.toLowerCase()}`;

      const existingJob = await crossChainProofQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state !== 'failed') {
          res.status(202).json({
            success: true,
            message: 'Repayment proof job already active or completed',
            data: {
              jobId: existingJob.id,
              status: state.toUpperCase(),
              statusUrl: `/api/v1/loan/repay/status/${existingJob.id}`,
            },
          });
          return;
        }
        await existingJob.remove();
      }

      console.log(`[${new Date().toISOString()}] Enqueuing repayment proof job ${jobId} for Token #${tokenId}, sourceTx ${targetHash}`);

      const job = await crossChainProofQueue.add(
        JOB_TYPES.PROVE_REPAYMENT,
        {
          type: 'repayment',
          sourceTxHash: targetHash,
          tokenId: Number(tokenId),
          chainKey: chainKey ? Number(chainKey) : 1,
        },
        {
          jobId,
          priority: 1,
        }
      );

      res.status(202).json({
        success: true,
        message: 'Repayment proof job queued successfully on Creditcoin CC3',
        data: {
          jobId: job.id,
          status: 'QUEUED',
          statusUrl: `/api/v1/loan/repay/status/${job.id}`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('[CreditOracleController] proveRepayment error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to queue cross-chain repayment proof'
      });
    }
  }

  /**
   * GET /api/v1/credit-oracle/proof/status/:jobId OR /api/v1/loan/repay/status/:jobId
   * Retrieves the status of any async proof job from BullMQ
   */
  public async getProofStatus(req: Request, res: Response): Promise<void> {
    try {
      const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
      if (!jobId) {
        res.status(400).json({ success: false, error: 'jobId is required' });
        return;
      }

      const { crossChainProofQueue } = await import('@/bullmq/scheduler.js');
      const job = await crossChainProofQueue.getJob(jobId);

      if (!job) {
        res.status(404).json({ success: false, error: 'Job not found' });
        return;
      }

      const state = await job.getState();
      const progress = job.progress;
      const result = job.returnvalue;
      const failedReason = job.failedReason;

      res.status(200).json({
        success: true,
        data: {
          jobId: job.id,
          state: state.toUpperCase(),
          progress: progress || 0,
          result: result || null,
          error: failedReason || null,
          attemptsMade: job.attemptsMade,
        },
      });
    } catch (error: any) {
      console.error('Error fetching proof job status:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch job status' });
    }
  }
}
