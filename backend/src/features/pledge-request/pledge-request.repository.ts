import { db } from "@/db/index.js";
import { eq, desc, and } from "drizzle-orm";
import { PledgeRequestModel, PledgeRequestModelType } from "./pledge-request.model.js";
import crypto from "crypto";

export async function createPledgeRequest(data: {
  borrowerId: string;
  borrowerWallet: string;
  pawnshopId: string;
  pawnshopWallet: string;
  goldDetails: Record<string, unknown>;
  requestedAmount?: string;
  goldImages?: string[];
  borrowerCreditScore?: number;
  borrowerCreditTier?: string;
  borrowerEvents?: unknown[];
  borrowerTransactionLinks?: unknown[];
}): Promise<PledgeRequestModelType> {
  const id = crypto.randomUUID();
  const [result] = await db
    .insert(PledgeRequestModel)
    .values({
      id,
      borrowerId: data.borrowerId,
      borrowerWallet: data.borrowerWallet,
      pawnshopId: data.pawnshopId,
      pawnshopWallet: data.pawnshopWallet,
      goldDetails: data.goldDetails,
      requestedAmount: data.requestedAmount || "",
      goldImages: data.goldImages || [],
      borrowerCreditScore: data.borrowerCreditScore || 0,
      borrowerCreditTier: data.borrowerCreditTier || "Unscored",
      borrowerEvents: data.borrowerEvents || [],
      borrowerTransactionLinks: data.borrowerTransactionLinks || [],
      status: "pending",
    })
    .returning();
  return result;
}

export async function getBorrowerLoans(borrowerId: string): Promise<any[]> {
  const { pool } = await import("@/db/index.js");
  const result = await pool.query(
    `SELECT 
      pr.id,
      pr.borrower_id as "borrowerId",
      pr.borrower_wallet as "borrowerWallet",
      pr.pawnshop_id as "pawnshopId",
      pr.pawnshop_wallet as "pawnshopWallet",
      pr.gold_details as "goldDetails",
      pr.status,
      pr.pawnshop_notes as "pawnshopNotes",
      pr.borrower_credit_score as "borrowerCreditScore",
      pr.verified_weight_g as "verifiedWeightG",
      pr.verified_karat as "verifiedKarat",
      pr.verified_appraised_value_usd as "verifiedAppraisedValueUsd",
      pr.payment_amount_usd as "paymentAmountUsd",
      pr.payment_tx_hash as "paymentTxHash",
      pr.payment_cc3_tx_hash as "paymentCc3TxHash",
      pr.payment_status as "paymentStatus",
      pr.paid_at as "paidAt",
      pr.sag_token_id as "sagTokenId",
      pr.sag_minted_at as "sagMintedAt",
      pr.pawnshop_contact_name as "pawnshopContactName",
      pr.pawnshop_contact_phone as "pawnshopContactPhone",
      pr.pawnshop_location as "pawnshopLocation",
      pr.loan_duration_months as "loanDurationMonths",
      pr.loan_maturity_date as "loanMaturityDate",
      pr.created_at as "createdAt",
      pr.updated_at as "updatedAt",
      COALESCE(r.total_repaid, 0)::numeric as "totalRepaid",
      COALESCE(r.repayment_count, 0)::int as "repaymentCount"
    FROM main.pledge_request pr
    LEFT JOIN (
      SELECT pledge_request_id, SUM(amount_usd) as total_repaid, COUNT(*) as repayment_count
      FROM main.loan_repayment
      GROUP BY pledge_request_id
    ) r ON r.pledge_request_id = pr.id
    WHERE pr.borrower_id = $1
    ORDER BY pr.created_at DESC`,
    [borrowerId]
  );
  return result.rows;
}

export async function getPledgeRequestsByBorrower(
  borrowerId: string,
  pageSize = 20,
  pageNumber = 1
): Promise<{ data: PledgeRequestModelType[]; total: number }> {
  const offset = (pageNumber - 1) * pageSize;

  const data = await db
    .select()
    .from(PledgeRequestModel)
    .where(eq(PledgeRequestModel.borrowerId, borrowerId))
    .orderBy(desc(PledgeRequestModel.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: PledgeRequestModel.id })
    .from(PledgeRequestModel)
    .where(eq(PledgeRequestModel.borrowerId, borrowerId));

  return { data, total: data.length };
}

export async function getPledgeRequestsByPawnshop(
  pawnshopId: string,
  status?: string,
  pageSize = 20,
  pageNumber = 1
): Promise<{ data: PledgeRequestModelType[]; total: number }> {
  const offset = (pageNumber - 1) * pageSize;
  const conditions = status
    ? and(eq(PledgeRequestModel.pawnshopId, pawnshopId), eq(PledgeRequestModel.status, status))
    : eq(PledgeRequestModel.pawnshopId, pawnshopId);

  const data = await db
    .select()
    .from(PledgeRequestModel)
    .where(conditions)
    .orderBy(desc(PledgeRequestModel.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { data, total: data.length };
}

export async function getPledgeRequestById(
  id: string
): Promise<PledgeRequestModelType | null> {
  const [result] = await db
    .select()
    .from(PledgeRequestModel)
    .where(eq(PledgeRequestModel.id, id))
    .limit(1);
  return result || null;
}

export async function updatePledgeRequestStatus(
  id: string,
  status: string,
  notes?: string,
  sagId?: string
): Promise<PledgeRequestModelType | null> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };
  if (notes !== undefined) updateData.pawnshopNotes = notes;
  if (sagId !== undefined) updateData.sagId = sagId;

  const [result] = await db
    .update(PledgeRequestModel)
    .set(updateData)
    .where(eq(PledgeRequestModel.id, id))
    .returning();
  return result || null;
}

/**
 * V2: Pawnshop verifies gold after physical meeting
 */
export async function verifyGold(
  id: string,
  data: {
    verificationStatus: string;
    verificationNotes?: string;
    verifiedWeightG?: number;
    verifiedKarat?: number;
    verifiedPurity?: number;
    verifiedAppraisedValueUsd?: number;
    loanDurationMonths?: number;
  }
): Promise<PledgeRequestModelType | null> {
  const updateData: Record<string, unknown> = {
    verificationStatus: data.verificationStatus,
    verificationNotes: data.verificationNotes || "",
    status: data.verificationStatus === "verified" ? "gold_verified" : "rejected",
    updatedAt: new Date(),
  };
  if (data.verifiedWeightG !== undefined) updateData.verifiedWeightG = String(data.verifiedWeightG);
  if (data.verifiedKarat !== undefined) updateData.verifiedKarat = data.verifiedKarat;
  if (data.verifiedPurity !== undefined) updateData.verifiedPurity = String(data.verifiedPurity);
  if (data.verifiedAppraisedValueUsd !== undefined) updateData.verifiedAppraisedValueUsd = String(data.verifiedAppraisedValueUsd);

  // Loan duration: save duration and calculate maturity date
  // Display: 1 day, 1-6 months, 1 year. Actual: scaled down for testing
  if (data.loanDurationMonths && data.verificationStatus === "verified") {
    updateData.loanDurationMonths = data.loanDurationMonths;
    // Test mode: 1 day=1min, 1mo=5min, 2mo=10min, 3mo=15min, 6mo=30min, 12mo=60min
    let durationMinutes: number;
    if (data.loanDurationMonths < 1) {
      durationMinutes = 1; // 1 day → 1 min for testing
    } else {
      durationMinutes = Math.max(1, Math.round(data.loanDurationMonths * 5));
    }
    const maturity = new Date();
    maturity.setMinutes(maturity.getMinutes() + durationMinutes);
    updateData.loanMaturityDate = maturity;
  }

  const [result] = await db
    .update(PledgeRequestModel)
    .set(updateData)
    .where(eq(PledgeRequestModel.id, id))
    .returning();
  return result || null;
}

/**
 * V2: Record ETH payment from pawnshop to borrower (with CC3 attestation)
 */
export async function recordPayment(
  id: string,
  data: {
    paymentTxHash: string;
    paymentCc3TxHash?: string;
    paymentAmountUsd: number;
  }
): Promise<PledgeRequestModelType | null> {
  const [result] = await db
    .update(PledgeRequestModel)
    .set({
      paymentTxHash: data.paymentTxHash,
      paymentCc3TxHash: data.paymentCc3TxHash || "",
      paymentAmountUsd: String(data.paymentAmountUsd),
      paymentStatus: "paid",
      status: "funded",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(PledgeRequestModel.id, id))
    .returning();
  return result || null;
}

/**
 * V2: Record SAG token minting
 */
export async function recordSagMint(
  id: string,
  sagTokenId: string,
  investmentTargetUsd?: number,
  minInvestmentUsd?: number
): Promise<PledgeRequestModelType | null> {
  const updateData: Record<string, unknown> = {
    sagTokenId,
    sagMintedAt: new Date(),
    sagId: sagTokenId,
    status: "sag_minted",
    updatedAt: new Date(),
  };
  if (investmentTargetUsd !== undefined) {
    updateData.investmentTargetUsd = String(investmentTargetUsd);
  }
  if (minInvestmentUsd !== undefined) {
    updateData.minInvestmentUsd = String(minInvestmentUsd);
  }
  const [result] = await db
    .update(PledgeRequestModel)
    .set(updateData)
    .where(eq(PledgeRequestModel.id, id))
    .returning();
  return result || null;
}

/**
 * V2: Update pawnshop contact info (shared with borrower after acceptance)
 */
export async function updatePawnshopContact(
  id: string,
  data: {
    pawnshopContactName: string;
    pawnshopContactPhone: string;
    pawnshopLocation: string;
  }
): Promise<PledgeRequestModelType | null> {
  const [result] = await db
    .update(PledgeRequestModel)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(PledgeRequestModel.id, id))
    .returning();
  return result || null;
}

export async function getAllPawnshops(): Promise<any[]> {
  const { pool } = await import("@/db/index.js");
  const result = await pool.query(
    `SELECT u.user_id as "userId", u.user_first_name as "firstName",
            u.user_last_name as "lastName", u.wallet_id as "walletId",
            p.business_name as "businessName",
            p.business_registration_no as "businessRegistrationNo",
            p.license_number as "licenseNumber",
            p.business_type as "businessType",
            p.year_established as "yearEstablished",
            p.city as "city",
            p.state as "state",
            p.country as "country",
            p.business_phone as "businessPhone",
            p.business_email as "businessEmail",
            p.services_offered as "servicesOffered",
            p.operating_hours as "operatingHours",
            p.kyc_status as "kycStatus",
            p.branch_count as "branchCount",
            p.address_line1 as "addressLine1"
     FROM main.user u
     LEFT JOIN main.pawnshop_profile p ON u.user_id = p.user_id
     WHERE u.role_id = 'PAWNSHOP' AND u.status = 'ACTIVE'`
  );
  return result.rows as any[];
}

/**
 * V2: Get borrower profile for attaching to pledge request
 */
export async function getBorrowerProfileForPledge(userId: string): Promise<{
  creditScore: number;
  creditTier: string;
  events: unknown[];
  transactionLinks: unknown[];
} | null> {
  const { pool } = await import("@/db/index.js");

  // Get wallet address from user table
  const userResult = await pool.query(
    `SELECT wallet_id FROM main.user WHERE user_id = $1`,
    [userId]
  );
  const wallet = userResult.rows[0]?.wallet_id;
  if (!wallet) return null;

  // Get credit profile from CC3 on-chain (source of truth)
  let creditScore = 0;
  let creditTier = "Unscored";
  try {
    const { AttestcoinOracleRelayerService } = await import("@/core/credit-bureau/attestcoin-oracle-relayer.service.js");
    const relayer = new AttestcoinOracleRelayerService();
    const onChainProfile = await relayer.getOnChainCreditProfile(wallet);
    if (onChainProfile) {
      creditScore = onChainProfile.score || 0;
      creditTier = onChainProfile.tier || "Unscored";
    }
  } catch (err: any) {
    console.warn('[PledgeRequest] Failed to fetch on-chain credit profile, falling back to KYC:', err.message);
    // Fallback to local KYC table
    try {
      const kycResult = await pool.query(
        `SELECT credit_score, credit_tier FROM main.kyc_submission WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (kycResult.rows[0]) {
        creditScore = kycResult.rows[0].credit_score || 0;
        creditTier = kycResult.rows[0].credit_tier || "Unscored";
      }
    } catch {}
  }

  // Get proven events from the proven_events table
  const events: unknown[] = [];
  try {
    const eventsResult = await pool.query(
      `SELECT source_tx_hash, block_height, protocol, event_type, volume_usd, timestamp, cc3_tx_hash
       FROM main.proven_events WHERE borrower_address = $1`,
      [wallet.toLowerCase()]
    );
    for (const row of eventsResult.rows) {
      events.push({
        sourceTxHash: row.source_tx_hash,
        blockHeight: row.block_height,
        protocol: row.protocol,
        eventType: row.event_type,
        volumeUSD: row.volume_usd,
        timestamp: row.timestamp,
        cc3TxHash: row.cc3_tx_hash || "",
      });
    }
  } catch {}

  // Build transaction links
  const transactionLinks: unknown[] = [];
  for (const evt of events as any[]) {
    if (evt.sourceTxHash) {
      transactionLinks.push({
        label: `Event: Protocol ${evt.protocol}, Type ${evt.eventType}`,
        sepoliaUrl: `https://eth-sepolia.blockscout.com/tx/${evt.sourceTxHash}`,
        cc3Url: evt.cc3TxHash ? `https://creditcoin-testnet.blockscout.com/tx/${evt.cc3TxHash}` : "",
        sourceTxHash: evt.sourceTxHash,
        cc3TxHash: evt.cc3TxHash || "",
      });
    }
  }

  return { creditScore, creditTier, events, transactionLinks };
}

/**
 * Get all borrowers for a pawnshop with aggregated loan status
 */
export async function getBorrowersByPawnshop(pawnshopId: string): Promise<any[]> {
  const { pool } = await import("@/db/index.js");
  const result = await pool.query(
    `SELECT 
      pr.borrower_id as "borrowerId",
      pr.borrower_wallet as "borrowerWallet",
      u.user_first_name as "borrowerFirstName",
      u.user_last_name as "borrowerLastName",
      pr.borrower_credit_score as "creditScore",
      pr.borrower_credit_tier as "creditTier",
      pr.gold_details as "goldDetails",
      pr.verified_weight_g as "verifiedWeightG",
      pr.verified_karat as "verifiedKarat",
      pr.verified_appraised_value_usd as "verifiedAppraisedValueUsd",
      pr.payment_amount_usd as "paymentAmountUsd",
      pr.payment_status as "paymentStatus",
      pr.payment_tx_hash as "paymentTxHash",
      pr.sag_token_id as "sagTokenId",
      pr.sag_minted_at as "sagMintedAt",
      pr.loan_duration_months as "loanDurationMonths",
      pr.loan_maturity_date as "loanMaturityDate",
      pr.status as "status",
      pr.created_at as "createdAt",
      pr.updated_at as "updatedAt",
      COALESCE(r.total_repaid, 0)::numeric as "totalRepaid",
      COALESCE(r.repayment_count, 0)::int as "repaymentCount"
    FROM main.pledge_request pr
    LEFT JOIN main.user u ON pr.borrower_id = u.user_id
    LEFT JOIN (
      SELECT pledge_request_id, SUM(amount_usd) as total_repaid, COUNT(*) as repayment_count
      FROM main.loan_repayment
      GROUP BY pledge_request_id
    ) r ON r.pledge_request_id = pr.id
    WHERE pr.pawnshop_id = $1
    ORDER BY pr.updated_at DESC`,
    [pawnshopId]
  );
  return result.rows;
}

/**
 * Get full borrower detail for a specific pledge request
 */
export async function getBorrowerDetail(pawnshopId: string, borrowerId: string): Promise<any> {
  const { pool } = await import("@/db/index.js");
  
  // Get all pledge requests for this borrower with this pawnshop
  const requestsResult = await pool.query(
    `SELECT 
      pr.id,
      pr.borrower_id as "borrowerId",
      pr.borrower_wallet as "borrowerWallet",
      pr.pawnshop_id as "pawnshopId",
      pr.pawnshop_wallet as "pawnshopWallet",
      pr.gold_details as "goldDetails",
      pr.requested_amount as "requestedAmount",
      pr.status,
      pr.pawnshop_notes as "pawnshopNotes",
      pr.sag_id as "sagId",
      pr.borrower_credit_score as "borrowerCreditScore",
      pr.borrower_credit_tier as "borrowerCreditTier",
      pr.borrower_events as "borrowerEvents",
      pr.borrower_transaction_links as "borrowerTransactionLinks",
      pr.gold_images as "goldImages",
      pr.verification_status as "verificationStatus",
      pr.verification_notes as "verificationNotes",
      pr.verified_weight_g as "verifiedWeightG",
      pr.verified_karat as "verifiedKarat",
      pr.verified_purity as "verifiedPurity",
      pr.verified_appraised_value_usd as "verifiedAppraisedValueUsd",
      pr.payment_amount_usd as "paymentAmountUsd",
      pr.payment_tx_hash as "paymentTxHash",
      pr.payment_cc3_tx_hash as "paymentCc3TxHash",
      pr.payment_status as "paymentStatus",
      pr.paid_at as "paidAt",
      pr.sag_token_id as "sagTokenId",
      pr.sag_minted_at as "sagMintedAt",
      pr.pawnshop_contact_name as "pawnshopContactName",
      pr.pawnshop_contact_phone as "pawnshopContactPhone",
      pr.pawnshop_location as "pawnshopLocation",
      pr.loan_duration_months as "loanDurationMonths",
      pr.loan_maturity_date as "loanMaturityDate",
      pr.investment_target_usd as "investmentTargetUsd",
      pr.investment_filled_usd as "investmentFilledUsd",
      pr.min_investment_usd as "minInvestmentUsd",
      pr.created_at as "createdAt",
      pr.updated_at as "updatedAt",
      u.user_first_name as "borrowerFirstName",
      u.user_last_name as "borrowerLastName",
      u.user_email as "borrowerEmail"
    FROM main.pledge_request pr
    LEFT JOIN main.user u ON pr.borrower_id = u.user_id
    WHERE pr.pawnshop_id = $1 AND pr.borrower_id = $2
    ORDER BY pr.created_at DESC`,
    [pawnshopId, borrowerId]
  );

  if (requestsResult.rows.length === 0) return null;

  // Get investments for the borrower's SAGs
  const sagTokenIds = requestsResult.rows
    .map(r => r.sag_token_id)
    .filter(Boolean);

  let investments: any[] = [];
  if (sagTokenIds.length > 0) {
    const invResult = await pool.query(
      `SELECT 
        i.id,
        i.user_id as "userId",
        i.sag_token_id as "sagTokenId",
        i.amount_usd as "amountUsd",
        i.eth_amount as "ethAmount",
        i.source_tx_hash as "sourceTxHash",
        i.source_chain as "sourceChain",
        i.cc3_tx_hash as "cc3TxHash",
        i.status,
        i.created_at as "createdAt",
        i.updated_at as "updatedAt",
        u.user_first_name as "investorFirstName",
        u.user_last_name as "investorLastName",
        u.wallet_id as "investorWallet"
      FROM main.investment i
      LEFT JOIN main.user u ON i.user_id = u.user_id
      WHERE i.sag_token_id = ANY($1)
      ORDER BY i.created_at DESC`,
      [sagTokenIds]
    );
    investments = invResult.rows;
  }

  // Get repayments for all pledge requests
  const pledgeRequestIds = requestsResult.rows.map(r => r.id);
  let repayments: any[] = [];
  if (pledgeRequestIds.length > 0) {
    const repayResult = await pool.query(
      `SELECT lr.*, lr.cc3_tx_hash as "cc3TxHash", lr.tx_hash as "txHash",
              lr.amount_usd as "amountUsd", lr.created_at as "createdAt"
       FROM main.loan_repayment lr
       WHERE lr.pledge_request_id = ANY($1)
       ORDER BY lr.created_at DESC`,
      [pledgeRequestIds]
    );
    repayments = repayResult.rows;
  }

  return {
    requests: requestsResult.rows,
    investments,
    repayments,
  };
}

/**
 * Record a borrower repayment against a pledge request
 */
export async function recordRepayment(data: {
  pledgeRequestId: string;
  borrowerId: string;
  pawnshopId: string;
  amountUsd: number;
  txHash?: string;
  cc3TxHash?: string;
  notes?: string;
}): Promise<any> {
  const { pool } = await import("@/db/index.js");
  // If tx_hash provided, check if a record already exists for this pledge request
  if (data.txHash) {
    const existing = await pool.query(
      `SELECT id FROM main.loan_repayment WHERE pledge_request_id = $1 AND tx_hash = $2 LIMIT 1`,
      [data.pledgeRequestId, data.txHash]
    );
    if (existing.rows.length > 0) {
      // Update existing record with CC3 hash
      const result = await pool.query(
        `UPDATE main.loan_repayment SET cc3_tx_hash = COALESCE($1, cc3_tx_hash), notes = COALESCE($2, notes)
         WHERE id = $3 RETURNING *`,
        [data.cc3TxHash || null, data.notes || null, existing.rows[0].id]
      );
      return result.rows[0];
    }
  }
  const result = await pool.query(
    `INSERT INTO main.loan_repayment (pledge_request_id, borrower_id, pawnshop_id, amount_usd, tx_hash, cc3_tx_hash, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.pledgeRequestId, data.borrowerId, data.pawnshopId, data.amountUsd, data.txHash || null, data.cc3TxHash || null, data.notes || null]
  );
  return result.rows[0];
}

/**
 * Get all repayments for a pledge request
 */
export async function getRepaymentsByPledgeRequest(pledgeRequestId: string): Promise<any[]> {
  const { pool } = await import("@/db/index.js");
  const result = await pool.query(
    `SELECT lr.id, lr.pledge_request_id as "pledgeRequestId", lr.borrower_id as "borrowerId",
            lr.pawnshop_id as "pawnshopId", lr.amount_usd as "amountUsd",
            lr.tx_hash as "txHash", lr.cc3_tx_hash as "cc3TxHash", lr.notes, lr.status,
            lr.created_at as "createdAt",
            u.user_first_name as "borrowerFirstName", u.user_last_name as "borrowerLastName"
     FROM main.loan_repayment lr
     LEFT JOIN main.user u ON lr.borrower_id = u.user_id
     WHERE lr.pledge_request_id = $1
     ORDER BY lr.created_at DESC`,
    [pledgeRequestId]
  );
  return result.rows;
}
