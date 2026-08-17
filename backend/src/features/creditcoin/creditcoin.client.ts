import { ethers } from 'ethers';
import { chainInfo, blockProver } from '@gluwa/usc-sdk';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';

export class CreditcoinClient {
  private static instance: CreditcoinClient;
  private creditcoinProvider: ethers.JsonRpcProvider;
  private sourceProvider: ethers.JsonRpcProvider;
  private adminWallet?: ethers.Wallet;
  private chainInfoProvider: chainInfo.PrecompileChainInfoProvider;
  private blockProver: blockProver.PrecompileBlockProver;

  private constructor() {
    // 1. Creditcoin CC3 Testnet Provider
    this.creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.rpcUrl, {
      chainId: CREDITCOIN_CONFIG.chainId,
      name: CREDITCOIN_CONFIG.chainName,
    });

    // 2. Source Chain (Ethereum Sepolia) Provider
    this.sourceProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.sourceChain.rpcUrl, {
      chainId: CREDITCOIN_CONFIG.sourceChain.chainId,
      name: CREDITCOIN_CONFIG.sourceChain.name,
    });

    // 3. Official @gluwa/usc-sdk Precompile Providers
    this.chainInfoProvider = new chainInfo.PrecompileChainInfoProvider(this.creditcoinProvider);
    this.blockProver = new blockProver.PrecompileBlockProver(this.creditcoinProvider);

    // 4. Admin Signer for CC3 state-changing transactions
    const privateKey = process.env.CREDITCOIN_ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (privateKey) {
      this.adminWallet = new ethers.Wallet(privateKey, this.creditcoinProvider);
    }
  }

  public static getInstance(): CreditcoinClient {
    if (!CreditcoinClient.instance) {
      CreditcoinClient.instance = new CreditcoinClient();
    }
    return CreditcoinClient.instance;
  }

  public getCreditcoinProvider(): ethers.JsonRpcProvider {
    return this.creditcoinProvider;
  }

  public getSourceProvider(): ethers.JsonRpcProvider {
    return this.sourceProvider;
  }

  public getChainInfoProvider(): chainInfo.PrecompileChainInfoProvider {
    return this.chainInfoProvider;
  }

  public getBlockProver(): blockProver.PrecompileBlockProver {
    return this.blockProver;
  }

  public getAdminWallet(): ethers.Wallet {
    if (!this.adminWallet) {
      throw new Error('CREDITCOIN_ADMIN_PRIVATE_KEY is not configured in environment variables');
    }
    return this.adminWallet;
  }

  /**
   * Dynamically queries Creditcoin's ChainInfo precompile (0xFD3) to resolve supported source chains and their chainKeys
   */
  public async getSupportedChains(): Promise<Array<{
    chainKey: number;
    chainId: number;
    chainName?: string;
    chainEncoding?: number;
  }>> {
    try {
      const chains = await this.chainInfoProvider.getSupportedChains();
      return chains.map((c: any) => ({
        chainKey: Number(c.chainKey),
        chainId: Number(c.chainId),
        chainName: c.chainName || (Number(c.chainKey) === 1 ? 'Ethereum Sepolia' : 'Unknown'),
        chainEncoding: c.chainEncoding ? Number(c.chainEncoding) : undefined,
      }));
    } catch (error) {
      console.warn('[CreditcoinClient] Failed to query on-chain ChainInfo precompile, falling back to static config:', error);
      return [
        {
          chainKey: CREDITCOIN_CONFIG.sourceChain.defaultChainKey,
          chainId: CREDITCOIN_CONFIG.sourceChain.chainId,
          chainName: CREDITCOIN_CONFIG.sourceChain.name,
        },
      ];
    }
  }

  /**
   * Resolves the Creditcoin-internal chainKey for a given EVM chainId
   */
  public async resolveChainKey(sourceEvmChainId: number = CREDITCOIN_CONFIG.sourceChain.chainId): Promise<number> {
    const supported = await this.getSupportedChains();
    const match = supported.find(c => c.chainId === sourceEvmChainId);
    if (match) {
      return match.chainKey;
    }
    console.warn(`[CreditcoinClient] No dynamic chainKey found for chainId ${sourceEvmChainId}, defaulting to ${CREDITCOIN_CONFIG.sourceChain.defaultChainKey}`);
    return CREDITCOIN_CONFIG.sourceChain.defaultChainKey;
  }

  public async getNetworkStatus(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    isHealthy: boolean;
    supportedChains: any[];
  }> {
    try {
      const network = await this.creditcoinProvider.getNetwork();
      const blockNumber = await this.creditcoinProvider.getBlockNumber();
      const feeData = await this.creditcoinProvider.getFeeData();
      const supportedChains = await this.getSupportedChains();

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
        isHealthy: true,
        supportedChains,
      };
    } catch (error) {
      console.error('Failed to query Creditcoin network status:', error);
      return {
        chainId: CREDITCOIN_CONFIG.chainId,
        blockNumber: 0,
        gasPrice: '0',
        isHealthy: false,
        supportedChains: [],
      };
    }
  }
}
