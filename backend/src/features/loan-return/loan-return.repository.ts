import { db, pool } from "@/db/index.js";
import { eq, desc, and } from "drizzle-orm";
import { LoanReturnModel, LoanReturnModelType, LoanReturnModelInsertType } from "./loan-return.model.js";
import crypto from "crypto";

/**
 * Ensures all required application tables exist in PostgreSQL main schema.
 */
export async function ensureRequiredTables(): Promise<void> {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS main;

    CREATE TABLE IF NOT EXISTS main.pledge_request (
      id VARCHAR(40) PRIMARY KEY,
      borrower_id VARCHAR(40) NOT NULL,
      borrower_wallet VARCHAR(42) NOT NULL,
      pawnshop_id VARCHAR(40) NOT NULL,
      pawnshop_wallet VARCHAR(42) NOT NULL,
      gold_details JSONB NOT NULL DEFAULT '{}',
      requested_amount VARCHAR(50) DEFAULT '',
      status VARCHAR(20) DEFAULT 'pending',
      pawnshop_notes TEXT DEFAULT '',
      sag_id VARCHAR(40),
      borrower_credit_score INTEGER DEFAULT 0,
      borrower_credit_tier VARCHAR(20) DEFAULT 'Unscored',
      borrower_events JSONB DEFAULT '[]',
      borrower_transaction_links JSONB DEFAULT '[]',
      gold_images JSONB DEFAULT '[]',
      verification_status VARCHAR(20) DEFAULT 'pending',
      verification_notes TEXT DEFAULT '',
      verified_weight_g NUMERIC,
      verified_karat INTEGER,
      verified_purity NUMERIC,
      verified_appraised_value_usd NUMERIC,
      payment_amount_usd NUMERIC,
      payment_tx_hash VARCHAR(66),
      payment_cc3_tx_hash VARCHAR(66),
      payment_status VARCHAR(20) DEFAULT 'pending',
      paid_at TIMESTAMP,
      sag_token_id VARCHAR(40),
      sag_minted_at TIMESTAMP,
      pawnshop_contact_name VARCHAR(100),
      pawnshop_contact_phone VARCHAR(30),
      pawnshop_location TEXT,
      loan_duration_months INTEGER,
      loan_maturity_date TIMESTAMP,
      investment_target_usd NUMERIC,
      investment_filled_usd NUMERIC DEFAULT 0,
      min_investment_usd NUMERIC DEFAULT 100,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS main.sag (
      sag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_id VARCHAR(100) DEFAULT '',
      sag_name TEXT NOT NULL,
      sag_description TEXT DEFAULT '',
      sag_properties JSONB DEFAULT '{}',
      sag_type TEXT DEFAULT 'Conventional',
      cert_no VARCHAR(100) UNIQUE,
      status VARCHAR(30) DEFAULT 'active',
      approval_status VARCHAR(30) DEFAULT 'pending',
      original_owner VARCHAR(42) DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS main.pawnshop_profile (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(40) NOT NULL UNIQUE,
      wallet_address VARCHAR(42) NOT NULL,
      business_name TEXT NOT NULL DEFAULT '',
      business_registration_no VARCHAR(50) DEFAULT '',
      license_number VARCHAR(50) DEFAULT '',
      license_expiry VARCHAR(20) DEFAULT '',
      business_type VARCHAR(50) DEFAULT 'ar-rahnu',
      year_established VARCHAR(10) DEFAULT '',
      number_of_employees VARCHAR(20) DEFAULT '',
      branch_count VARCHAR(10) DEFAULT '1',
      business_phone VARCHAR(20) DEFAULT '',
      business_email VARCHAR(100) DEFAULT '',
      website VARCHAR(200) DEFAULT '',
      address_line1 TEXT DEFAULT '',
      address_line2 TEXT DEFAULT '',
      city VARCHAR(100) DEFAULT '',
      state VARCHAR(100) DEFAULT '',
      postal_code VARCHAR(10) DEFAULT '',
      country VARCHAR(50) DEFAULT 'Nigeria',
      latitude VARCHAR(20) DEFAULT '',
      longitude VARCHAR(20) DEFAULT '',
      operating_hours JSONB DEFAULT '{}',
      services_offered JSONB DEFAULT '[]',
      kyc_status VARCHAR(20) DEFAULT 'pending',
      kyc_submitted_at TIMESTAMP,
      kyc_approved_at TIMESTAMP,
      kyc_rejection_reason TEXT,
      documents JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS main.loan_return (
      id VARCHAR(40) PRIMARY KEY,
      pledge_request_id VARCHAR(40) NOT NULL,
      sag_token_id VARCHAR(100) NOT NULL,
      pawnshop_id VARCHAR(40),
      pawnshop_wallet VARCHAR(42) NOT NULL,
      investor_wallet VARCHAR(42) NOT NULL,
      principal_usd NUMERIC NOT NULL,
      profit_usd NUMERIC NOT NULL,
      total_return_usd NUMERIC NOT NULL,
      principal_wei VARCHAR(78),
      profit_wei VARCHAR(78),
      total_return_wei VARCHAR(78),
      roi_percentage NUMERIC NOT NULL,
      duration_months INTEGER NOT NULL,
      sepolia_tx_hash VARCHAR(66) NOT NULL UNIQUE,
      cc3_tx_hash VARCHAR(66),
      proof_job_id VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      distributed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_loan_return_token_id ON main.loan_return (sag_token_id);
    CREATE INDEX IF NOT EXISTS idx_loan_return_investor ON main.loan_return (investor_wallet);
    CREATE INDEX IF NOT EXISTS idx_loan_return_pledge_req ON main.loan_return (pledge_request_id);
  `);
}

export async function createLoanReturn(data: {
  pledgeRequestId: string;
  sagTokenId: string;
  pawnshopId?: string;
  pawnshopWallet: string;
  investorWallet: string;
  principalUsd: number;
  profitUsd: number;
  totalReturnUsd: number;
  principalWei?: string;
  profitWei?: string;
  totalReturnWei?: string;
  roiPercentage: number;
  durationMonths: number;
  sepoliaTxHash: string;
  proofJobId?: string;
  status?: string;
}): Promise<LoanReturnModelType> {
  await ensureRequiredTables();
  const id = crypto.randomUUID();

  const [result] = await db
    .insert(LoanReturnModel)
    .values({
      id,
      pledgeRequestId: data.pledgeRequestId,
      sagTokenId: data.sagTokenId,
      pawnshopId: data.pawnshopId || "",
      pawnshopWallet: data.pawnshopWallet.toLowerCase(),
      investorWallet: data.investorWallet.toLowerCase(),
      principalUsd: String(data.principalUsd),
      profitUsd: String(data.profitUsd),
      totalReturnUsd: String(data.totalReturnUsd),
      principalWei: data.principalWei || "0",
      profitWei: data.profitWei || "0",
      totalReturnWei: data.totalReturnWei || "0",
      roiPercentage: String(data.roiPercentage),
      durationMonths: data.durationMonths,
      sepoliaTxHash: data.sepoliaTxHash,
      proofJobId: data.proofJobId || "",
      status: data.status || "pending",
    })
    .returning();

  return result;
}

export async function getLoanReturnById(id: string): Promise<LoanReturnModelType | null> {
  await ensureRequiredTables();
  const [result] = await db
    .select()
    .from(LoanReturnModel)
    .where(eq(LoanReturnModel.id, id))
    .limit(1);
  return result || null;
}

export async function getLoanReturnByPledgeRequestId(
  pledgeRequestId: string
): Promise<LoanReturnModelType | null> {
  await ensureRequiredTables();
  const [result] = await db
    .select()
    .from(LoanReturnModel)
    .where(eq(LoanReturnModel.pledgeRequestId, pledgeRequestId))
    .orderBy(desc(LoanReturnModel.createdAt))
    .limit(1);
  return result || null;
}

export async function getLoanReturnByTokenId(
  tokenId: string
): Promise<LoanReturnModelType | null> {
  await ensureRequiredTables();
  const [result] = await db
    .select()
    .from(LoanReturnModel)
    .where(eq(LoanReturnModel.sagTokenId, tokenId))
    .orderBy(desc(LoanReturnModel.createdAt))
    .limit(1);
  return result || null;
}

export async function getLoanReturnsByInvestor(
  investorWallet: string
): Promise<LoanReturnModelType[]> {
  await ensureRequiredTables();
  return db
    .select()
    .from(LoanReturnModel)
    .where(eq(LoanReturnModel.investorWallet, investorWallet.toLowerCase()))
    .orderBy(desc(LoanReturnModel.createdAt));
}

export async function getLoanReturnsByPawnshop(
  pawnshopWallet: string
): Promise<LoanReturnModelType[]> {
  await ensureRequiredTables();
  return db
    .select()
    .from(LoanReturnModel)
    .where(eq(LoanReturnModel.pawnshopWallet, pawnshopWallet.toLowerCase()))
    .orderBy(desc(LoanReturnModel.createdAt));
}

export async function updateLoanReturnByTxHash(
  sepoliaTxHash: string,
  updateData: {
    cc3TxHash?: string;
    proofJobId?: string;
    status?: string;
    distributedAt?: Date;
  }
): Promise<LoanReturnModelType | null> {
  await ensureRequiredTables();
  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (updateData.cc3TxHash !== undefined) patch.cc3TxHash = updateData.cc3TxHash;
  if (updateData.proofJobId !== undefined) patch.proofJobId = updateData.proofJobId;
  if (updateData.status !== undefined) patch.status = updateData.status;
  if (updateData.distributedAt !== undefined) patch.distributedAt = updateData.distributedAt;

  const [result] = await db
    .update(LoanReturnModel)
    .set(patch)
    .where(eq(LoanReturnModel.sepoliaTxHash, sepoliaTxHash))
    .returning();

  return result || null;
}
