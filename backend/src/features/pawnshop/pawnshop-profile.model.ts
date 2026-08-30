import { MainSchema } from "@/db/db.schema.js";
import { jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { EVM_ADDRESS_LENGTH } from "@/db/db.constants.js";

export const PawnshopProfileModel = MainSchema.table('pawnshop_profile', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  userId: varchar('user_id', { length: 40 }).notNull().unique(),
  walletAddress: varchar('wallet_address', { length: EVM_ADDRESS_LENGTH }).notNull(),

  // Business Info
  businessName: text('business_name').notNull().default(''),
  businessRegistrationNo: varchar('business_registration_no', { length: 50 }).default(''),
  licenseNumber: varchar('license_number', { length: 50 }).default(''),
  licenseExpiry: varchar('license_expiry', { length: 20 }).default(''),
  businessType: varchar('business_type', { length: 50 }).default('ar-rahnu'),
  yearEstablished: varchar('year_established', { length: 10 }).default(''),
  numberOfEmployees: varchar('number_of_employees', { length: 20 }).default(''),
  branchCount: varchar('branch_count', { length: 10 }).default('1'),

  // Contact Info
  businessPhone: varchar('business_phone', { length: 20 }).default(''),
  businessEmail: varchar('business_email', { length: 100 }).default(''),
  website: varchar('website', { length: 200 }).default(''),

  // Address (structured)
  addressLine1: text('address_line1').default(''),
  addressLine2: text('address_line2').default(''),
  city: varchar('city', { length: 100 }).default(''),
  state: varchar('state', { length: 100 }).default(''),
  postalCode: varchar('postal_code', { length: 10 }).default(''),
  country: varchar('country', { length: 50 }).default('Nigeria'),

  // Location (GPS)
  latitude: varchar('latitude', { length: 20 }).default(''),
  longitude: varchar('longitude', { length: 20 }).default(''),

  // Operating Hours
  operatingHours: jsonb('operating_hours').default({}),

  // Services
  servicesOffered: jsonb('services_offered').default([]),

  // KYC Status
  kycStatus: varchar('kyc_status', { length: 20 }).default('pending'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  kycApprovedAt: timestamp('kyc_approved_at'),
  kycRejectionReason: text('kyc_rejection_reason'),

  // Documents (JSONB array of {name, url, type})
  documents: jsonb('documents').default([]),

  // Status
  status: varchar('status', { length: 20 }).default('active'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const CreatePawnshopProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessRegistrationNo: z.string().optional(),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpiry: z.string().optional(),
  businessType: z.string().optional(),
  yearEstablished: z.string().optional(),
  numberOfEmployees: z.string().optional(),
  branchCount: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().optional(),
  website: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  operatingHours: z.record(z.string(), z.string()).optional(),
  servicesOffered: z.array(z.string()).optional(),
});

export type CreatePawnshopProfile = z.infer<typeof CreatePawnshopProfileSchema>;
export type PawnshopProfileModelType = typeof PawnshopProfileModel.$inferSelect;
