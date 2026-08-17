import { ethers } from 'ethers';
import { CreditcoinClient } from './creditcoin.client.js';
import { encryptPrivateKey, decryptPrivateKey } from '../../util/encryption.js';

export interface EVMWalletInfo {
  address: string;
  encryptedPrivateKey: string;
  balanceCTC: string;
}

export class CreditcoinWalletService {
  private client: CreditcoinClient;

  constructor() {
    this.client = CreditcoinClient.getInstance();
  }

  /**
   * Generates a new EVM wallet for a pawnshop or investor on Creditcoin CC3
   */
  public createWallet(): EVMWalletInfo {
    const randomWallet = ethers.Wallet.createRandom();
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'sanad-default-encryption-master-key-32b';
    const encryptedPrivateKey = encryptPrivateKey(randomWallet.privateKey, masterKey);

    return {
      address: randomWallet.address,
      encryptedPrivateKey,
      balanceCTC: '0.0',
    };
  }

  /**
   * Fetches on-chain balance on Creditcoin 3 (tCTC)
   */
  public async getBalance(address: string): Promise<string> {
    try {
      const provider = this.client.getCreditcoinProvider();
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error(`[CreditcoinWallet] Failed to get balance for ${address}:`, err);
      return '0.0';
    }
  }

  /**
   * Recovers a signer instance using an encrypted private key
   */
  public getSigner(encryptedPrivateKey: string): ethers.Wallet {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'sanad-default-encryption-master-key-32b';
    const decryptedKey = decryptPrivateKey(encryptedPrivateKey, masterKey);
    return new ethers.Wallet(decryptedKey, this.client.getCreditcoinProvider());
  }
}
