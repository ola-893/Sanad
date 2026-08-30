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
  if (data.loanDurationMonths && data.verificationStatus === "verified") {
    updateData.loanDurationMonths = data.loanDurationMonths;
    // For testing: duration is in minutes. For production: convert to months.
    const maturity = new Date();
    maturity.setMinutes(maturity.getMinutes() + data.loanDurationMonths);
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
  sagTokenId: string
): Promise<PledgeRequestModelType | null> {
  const [result] = await db
    .update(PledgeRequestModel)
    .set({
      sagTokenId,
      sagMintedAt: new Date(),
      sagId: sagTokenId,
      status: "sag_minted",
      updatedAt: new Date(),
    })
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

  // Get credit profile from credit bureau (local DB fallback)
  let creditScore = 0;
  let creditTier = "Unscored";
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
