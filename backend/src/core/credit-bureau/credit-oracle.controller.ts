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
   * POST /api/credit-oracle/prove-pawnshop-payment
   * Proves a pawnshop-to-borrower ETH payment on CC3 via Attestcoin BlockProver
   */
  public async provePawnshopPayment(req: Request, res: Response): Promise<void> {
    try {
      const { sourceTxHash, chainKey, borrowerAddress } = req.body;
      if (!sourceTxHash || typeof sourceTxHash !== 'string' || !sourceTxHash.startsWith('0x')) {
        res.status(400).json({ success: false, message: 'Valid sourceTxHash required (0x...)' });
        return;
      }

      const result = await this.relayerService.provePawnshopPayment(
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
      console.error('[CreditOracleController] provePawnshopPayment error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to prove pawnshop payment' });
    }
  }

  /**
   * POST /api/v1/credit-oracle/prove-repayment OR /api/v1/loan/repay/prove
   * Cryptographically verifies an Ethereum Sepolia repayment tx and settles the loan on CC3
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

      const result = await this.relayerService.proveAndSettleSepoliaRepayment(
        Number(tokenId),
        targetHash,
        chainKey ? Number(chainKey) : 1
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to prove and settle repayment on Creditcoin'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      console.error('[CreditOracleController] proveRepayment error:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to prove and settle cross-chain repayment'
      });
    }
  }
}
