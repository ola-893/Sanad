import { db } from "@/db/index.js";
import { eq, desc, and } from "drizzle-orm";
import { PledgeRequestModel, PledgeRequestModelType } from "./pledge-request.model.js";

export async function createPledgeRequest(data: {
  borrowerId: string;
  borrowerWallet: string;
  pawnshopId: string;
  pawnshopWallet: string;
  goldDetails: Record<string, unknown>;
  requestedAmount?: string;
}): Promise<PledgeRequestModelType> {
  const [result] = await db
    .insert(PledgeRequestModel)
    .values({
      borrowerId: data.borrowerId,
      borrowerWallet: data.borrowerWallet,
      pawnshopId: data.pawnshopId,
      pawnshopWallet: data.pawnshopWallet,
      goldDetails: data.goldDetails,
      requestedAmount: data.requestedAmount || '',
      status: 'pending',
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

export async function getPawnshopByUserId(
  userId: string
): Promise<{ userId: string; walletId: string; roleId: string } | null> {
  const { pool } = await import('@/db/index.js');
  const result = await pool.query(
    `SELECT user_id as "userId", wallet_id as "walletId", role_id as "roleId"
     FROM main.user WHERE user_id = $1 AND role_id = 'PAWNSHOP'`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function getAllPawnshops(): Promise<any[]> {
  const { pool } = await import('@/db/index.js');
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
