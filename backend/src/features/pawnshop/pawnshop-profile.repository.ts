import { db } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { PawnshopProfileModel, PawnshopProfileModelType } from "./pawnshop-profile.model.js";

export async function createPawnshopProfile(data: {
  userId: string;
  walletAddress: string;
  businessName: string;
  businessRegistrationNo?: string;
  licenseNumber: string;
  licenseExpiry?: string;
  businessType?: string;
  yearEstablished?: string;
  numberOfEmployees?: string;
  branchCount?: string;
  businessPhone?: string;
  businessEmail?: string;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  operatingHours?: Record<string, string>;
  servicesOffered?: string[];
}): Promise<PawnshopProfileModelType> {
  const [result] = await db
    .insert(PawnshopProfileModel)
    .values({
      userId: data.userId,
      walletAddress: data.walletAddress,
      businessName: data.businessName,
      businessRegistrationNo: data.businessRegistrationNo || '',
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry || '',
      businessType: data.businessType || 'ar-rahnu',
      yearEstablished: data.yearEstablished || '',
      numberOfEmployees: data.numberOfEmployees || '',
      branchCount: data.branchCount || '1',
      businessPhone: data.businessPhone || '',
      businessEmail: data.businessEmail || '',
      website: data.website || '',
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 || '',
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || '',
      country: data.country || 'Malaysia',
      latitude: data.latitude || '',
      longitude: data.longitude || '',
      operatingHours: data.operatingHours || {},
      servicesOffered: data.servicesOffered || [],
      kycStatus: 'pending',
      status: 'active',
    })
    .returning();
  return result;
}

export async function getPawnshopProfileByUserId(
  userId: string
): Promise<PawnshopProfileModelType | null> {
  const [result] = await db
    .select()
    .from(PawnshopProfileModel)
    .where(eq(PawnshopProfileModel.userId, userId))
    .limit(1);
  return result || null;
}

export async function getPawnshopProfileByWallet(
  walletAddress: string
): Promise<PawnshopProfileModelType | null> {
  const [result] = await db
    .select()
    .from(PawnshopProfileModel)
    .where(eq(PawnshopProfileModel.walletAddress, walletAddress.toLowerCase()))
    .limit(1);
  return result || null;
}

export async function updatePawnshopProfile(
  userId: string,
  data: Partial<{
    businessName: string;
    businessRegistrationNo: string;
    licenseNumber: string;
    licenseExpiry: string;
    businessType: string;
    yearEstablished: string;
    numberOfEmployees: string;
    branchCount: string;
    businessPhone: string;
    businessEmail: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: string;
    longitude: string;
    operatingHours: Record<string, string>;
    servicesOffered: string[];
    kycStatus: string;
    kycRejectionReason: string;
    documents: unknown[];
  }>
): Promise<PawnshopProfileModelType | null> {
  const [result] = await db
    .update(PawnshopProfileModel)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(PawnshopProfileModel.userId, userId))
    .returning();
  return result || null;
}

export async function getAllPawnshopProfiles(): Promise<PawnshopProfileModelType[]> {
  return db.select().from(PawnshopProfileModel);
}

export async function getPawnshopProfilesByKycStatus(
  kycStatus: string
): Promise<PawnshopProfileModelType[]> {
  return db
    .select()
    .from(PawnshopProfileModel)
    .where(eq(PawnshopProfileModel.kycStatus, kycStatus));
}

export async function updatePawnshopKycStatus(
  userId: string,
  kycStatus: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string
): Promise<PawnshopProfileModelType | null> {
  const updateData: Record<string, unknown> = {
    kycStatus,
    updatedAt: new Date(),
  };

  if (kycStatus === 'approved') {
    updateData.kycApprovedAt = new Date();
  }
  if (kycStatus === 'rejected' && rejectionReason) {
    updateData.kycRejectionReason = rejectionReason;
  }

  const [result] = await db
    .update(PawnshopProfileModel)
    .set(updateData)
    .where(eq(PawnshopProfileModel.userId, userId))
    .returning();
  return result || null;
}
