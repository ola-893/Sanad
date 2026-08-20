import { Request, Response } from 'express';
import { DefiDiscoveryService } from './defi-discovery.service.js';
import { AttestcoinOracleRelayerService } from './attestcoin-oracle-relayer.service.js';

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
        sourceChain: 'Ethereum Mainnet (Chain Key: 3)',
        blockProverPrecompile: '0x0000000000000000000000000000000000000FD2',
        chainInfoPrecompile: '0x0000000000000000000000000000000000000fD3',
        proofApiUrl: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
        explorerUrl: `https://creditcoin-testnet.blockscout.com/address/${this.relayerService.getOracleAddress()}`,
      }
    });
  }
}
