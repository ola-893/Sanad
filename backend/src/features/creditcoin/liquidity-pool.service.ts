import { ethers } from 'ethers';
import { CreditcoinClient } from './creditcoin.client.js';
import { CREDITCOIN_CONFIG } from './creditcoin.config.js';
import { SANAD_LIQUIDITY_POOL_ABI } from './contracts/SanadLiquidityPool.abi.js';

export interface PoolStats {
  totalPoolLiquidityCTC: string;
  contractAddress: string;
}

export interface DepositResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  depositedAmountCTC?: string;
  newTotalLiquidityCTC?: string;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  withdrawnAmountCTC?: string;
  error?: string;
}

export interface DirectRepaymentResult {
  success: boolean;
  tokenId: string;
  transactionHash?: string;
  blockNumber?: number;
  repaidAmountCTC?: string;
  principalRepaidCTC?: string;
  ujrahFeeCTC?: string;
  status: 'completed' | 'failed';
  error?: string;
}

export class LiquidityPoolService {
  private client: CreditcoinClient;
  private contractAddress: string;

  constructor() {
    this.client = CreditcoinClient.getInstance();
    this.contractAddress = CREDITCOIN_CONFIG.contracts.liquidityPoolAddress;
  }

  private getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
    const runner = signerOrProvider || this.client.getAdminWallet();
    return new ethers.Contract(this.contractAddress, SANAD_LIQUIDITY_POOL_ABI, runner);
  }

  /**
   * Deposit native CTC into the pool
   */
  public async depositLiquidity(amountCTC: string, signer?: ethers.Signer): Promise<DepositResult> {
    try {
      const contract = this.getContract(signer);
      const parsedAmount = ethers.parseEther(amountCTC);

      const tx = await contract.depositLiquidity({ value: parsedAmount });
      const receipt = await tx.wait();

      const totalLiquidity = await this.getTotalPoolLiquidity();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        depositedAmountCTC: amountCTC,
        newTotalLiquidityCTC: totalLiquidity,
      };
    } catch (error: any) {
      console.error('[LiquidityPool] Deposit error:', error);
      return {
        success: false,
        error: error.message || 'Failed to deposit liquidity',
      };
    }
  }

  /**
   * Withdraw native CTC from the pool
   */
  public async withdrawLiquidity(amountCTC: string, signer?: ethers.Signer): Promise<WithdrawResult> {
    try {
      const contract = this.getContract(signer);
      const parsedAmount = ethers.parseEther(amountCTC);

      const tx = await contract.withdrawLiquidity(parsedAmount);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        withdrawnAmountCTC: amountCTC,
      };
    } catch (error: any) {
      console.error('[LiquidityPool] Withdrawal error:', error);
      return {
        success: false,
        error: error.message || 'Failed to withdraw liquidity',
      };
    }
  }

  /**
   * Fund an originated loan note with native CTC from the pool
   */
  public async fundLoan(tokenId: string, amountCTC: string): Promise<{
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const contract = this.getContract();
      const parsedAmount = ethers.parseEther(amountCTC);

      const tx = await contract.fundLoan(tokenId, parsedAmount);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error(`[LiquidityPool] Loan funding error for token ${tokenId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to fund loan',
      };
    }
  }

  /**
   * Directly repay an active loan on Creditcoin CC3 using native CTC
   */
  public async repayLoanDirect(tokenId: string, amountCTC?: string, signer?: ethers.Signer): Promise<DirectRepaymentResult> {
    try {
      const contract = this.getContract(signer);
      
      // Determine required repayment amount if not explicitly passed
      let valueToSend: bigint;
      if (amountCTC) {
        valueToSend = ethers.parseEther(amountCTC);
      } else {
        const principal = await contract.tokenLoanBalance(tokenId);
        const ujrah = await contract.calculateAccruedUjrah(tokenId).catch(() => 0n);
        valueToSend = principal + ujrah;
      }

      if (valueToSend === 0n) {
        throw new Error(`Token ${tokenId} has zero loan balance or is already settled.`);
      }

      console.log(`[LiquidityPool] Executing repayLoanDirect for Token #${tokenId} with value: ${ethers.formatEther(valueToSend)} CTC`);
      const tx = await contract.repayLoanDirect(tokenId, { value: valueToSend });
      const receipt = await tx.wait();

      return {
        success: true,
        tokenId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        repaidAmountCTC: ethers.formatEther(valueToSend),
        status: 'completed',
      };
    } catch (error: any) {
      console.error(`[LiquidityPool] Direct repayment error for token ${tokenId}:`, error);
      return {
        success: false,
        tokenId,
        status: 'failed',
        error: error.message || 'Failed to process on-chain repayment',
      };
    }
  }

  /**
   * Get total pool liquidity in CTC
   */
  public async getTotalPoolLiquidity(): Promise<string> {
    try {
      const contract = this.getContract(this.client.getCreditcoinProvider());
      const raw = await contract.totalPoolLiquidity();
      return ethers.formatEther(raw);
    } catch (error) {
      console.error('[LiquidityPool] Failed to fetch total liquidity:', error);
      return '0.0';
    }
  }

  /**
   * Get LP balance for a specific provider
   */
  public async getLpBalance(providerAddress: string): Promise<string> {
    try {
      const contract = this.getContract(this.client.getCreditcoinProvider());
      const raw = await contract.lpBalances(providerAddress);
      return ethers.formatEther(raw);
    } catch (error) {
      console.error(`[LiquidityPool] Failed to fetch LP balance for ${providerAddress}:`, error);
      return '0.0';
    }
  }

  /**
   * Get active loan balance for a token
   */
  public async getLoanBalance(tokenId: string): Promise<string> {
    try {
      const contract = this.getContract(this.client.getCreditcoinProvider());
      const raw = await contract.tokenLoanBalance(tokenId);
      return ethers.formatEther(raw);
    } catch (error) {
      console.error(`[LiquidityPool] Failed to fetch loan balance for token ${tokenId}:`, error);
      return '0.0';
    }
  }
}
