import { ethers } from 'ethers';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';

export class CreditcoinClient {
  private static instance: CreditcoinClient;
  private creditcoinProvider: ethers.JsonRpcProvider;
  private adminWallet?: ethers.Wallet;

  private constructor() {
    // 1. Creditcoin CC3 Testnet Provider
    this.creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_CONFIG.rpcUrl, CREDITCOIN_CONFIG.chainId, {
      staticNetwork: ethers.Network.from(CREDITCOIN_CONFIG.chainId),
    });

    // 2. Admin Signer for CC3 state-changing transactions
    const privateKey = process.env.CREDITCOIN_ADMIN_PRIVATE_KEY || process.env.CREDITCOIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
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

  public getAdminWallet(): ethers.Wallet {
    if (!this.adminWallet) {
      throw new Error('CREDITCOIN_ADMIN_PRIVATE_KEY is not configured in environment variables');
    }
    return this.adminWallet;
  }

  public async getNetworkStatus(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    isHealthy: boolean;
  }> {
    try {
      const network = await this.creditcoinProvider.getNetwork();
      const blockNumber = await this.creditcoinProvider.getBlockNumber();
      const feeData = await this.creditcoinProvider.getFeeData();

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
        isHealthy: true,
      };
    } catch (error) {
      console.error('Failed to query Creditcoin network status:', error);
      return {
        chainId: CREDITCOIN_CONFIG.chainId,
        blockNumber: 0,
        gasPrice: '0',
        isHealthy: false,
      };
    }
  }
}
