import { ethers } from 'ethers';
import { CreditcoinClient } from './creditcoin.client.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { SAG_TOKEN_ABI } from './contracts/SAGToken.abi.js';

export interface MintSagParams {
  pawnshopAddress: string;
  borrowerAddress: string;
  weightGrams: number; // in grams (e.g. 50.5g -> scaled or int)
  karat: number;       // 18, 22, 24
  appraisedValueUSD: number; // USD amount
  loanAmount: number;        // Borrowed USD amount
  ipfsMetadataUri: string;   // Physical vault custody receipt
}

export enum CollateralStatus {
  PendingValuation = 0,
  ActivePledged = 1,
  Repaid = 2,
  Defaulted = 3,
  Liquidated = 4
}

export class SagTokenService {
  private client: CreditcoinClient;
  private contractAddress: string;

  constructor() {
    this.client = CreditcoinClient.getInstance();
    this.contractAddress = CREDITCOIN_CONFIG.contracts.sagTokenAddress;
  }

  private getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    const runner = signerOrProvider || this.client.getAdminWallet();
    return new ethers.Contract(this.contractAddress, SAG_TOKEN_ABI, runner);
  }

  /**
   * Mints an ERC-721 Gold Collateral SAG NFT on Creditcoin 3 (CC3)
   */
  public async mintCollateral(params: MintSagParams): Promise<{
    success: boolean;
    tokenId?: string;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      console.log(`[Creditcoin] Minting SAG Collateral for pawnshop ${params.pawnshopAddress}, weight: ${params.weightGrams}g, karat: ${params.karat}k`);
      
      const contract = this.getContract();
      
      // Scaled amounts for EVM integer precision
      const weightScaled = Math.round(params.weightGrams * 100); // 2 decimals for grams (e.g. 50.50g -> 5050)
      const valueUsdScaled = ethers.parseUnits(params.appraisedValueUSD.toString(), 6); // 6 decimals for USD/USDC
      const loanAmountScaled = ethers.parseUnits(params.loanAmount.toString(), 6);

      const tx = await contract.mintCollateral(
        params.pawnshopAddress,
        params.borrowerAddress,
        weightScaled,
        params.karat,
        valueUsdScaled,
        loanAmountScaled,
        params.ipfsMetadataUri
      );

      console.log(`[Creditcoin] Mint transaction broadcast: ${tx.hash}. Awaiting confirmation...`);
      const receipt = await tx.wait();

      // Find GoldCollateralMinted event
      let tokenId = '1';
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'GoldCollateralMinted') {
            tokenId = parsedLog.args[0].toString();
            break;
          }
        } catch {
          // Log not from this contract interface
        }
      }

      return {
        success: true,
        tokenId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error('[Creditcoin] Error minting SAG collateral token:', error);
      return {
        success: false,
        error: error.message || 'Failed to mint SAG token on Creditcoin',
      };
    }
  }

  /**
   * Reads on-chain gold collateral metadata for a given token ID
   */
  public async getCollateral(tokenId: string): Promise<any> {
    try {
      const contract = this.getContract(this.client.getCreditcoinProvider());
      const raw = await contract.getCollateral(tokenId);
      return {
        weightGrams: Number(raw.weightGrams) / 100,
        karat: Number(raw.karat),
        appraisedValueUSD: ethers.formatUnits(raw.appraisedValueUSD, 6),
        loanAmount: ethers.formatUnits(raw.loanAmount, 6),
        ltvPercentage: Number(raw.ltvBps) / 100,
        pawnshop: raw.pawnshop,
        borrower: raw.borrower,
        status: CollateralStatus[Number(raw.status)] || 'Unknown',
        ipfsMetadataUri: raw.ipfsMetadataUri,
      };
    } catch (error) {
      console.error(`[Creditcoin] Failed to get collateral for tokenId ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Updates collateral status (e.g. upon repayment or default)
   */
  public async updateStatus(tokenId: string, status: CollateralStatus): Promise<string> {
    const contract = this.getContract();
    const tx = await contract.setStatus(tokenId, status);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
