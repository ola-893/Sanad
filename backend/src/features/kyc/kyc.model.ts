import { integer, jsonb, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { MainSchema } from '@/db/db.schema.js';

/**
 * KYC Submission Model
 * Implements Malaysia BNM AML/CFT risk-based CDD/EDD state machine:
 * 'not_started' -> 'submitted' -> 'screening' -> 'under_review' -> 'approved' | 'approved_with_edd' | 'rejected'
 */
export const KycSubmission = MainSchema.table('kyc_submission', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  userId: varchar('user_id', { length: 40 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('submitted'), // submitted | screening | under_review | approved | approved_with_edd | rejected
  riskScore: integer('risk_score').notNull().default(0),
  amlStatus: varchar('aml_status', { length: 20 }).notNull().default('unscreened'), // unscreened | clear | flagged | watchlist
  documentType: varchar('document_type', { length: 40 }).notNull().default('MyKad'), // MyKad | Passport | DriverLicense
  flags: jsonb('flags').notNull().default('[]'), // string[]
  screenedAt: timestamp('screened_at'),
  reviewedBy: varchar('reviewed_by', { length: 40 }), // Reviewer user ID (compliance role)
  reviewedAt: timestamp('reviewed_at'),
  reviewerNotes: text('reviewer_notes'),
  eddSourceOfFunds: text('edd_source_of_funds'), // Required for approved_with_edd
  eddApprovedBy: varchar('edd_approved_by', { length: 40 }), // Named senior approver per BNM requirement
  nextReviewDate: timestamp('next_review_date'), // Review cadence (e.g. 2 years for EDD)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type KycSubmissionType = typeof KycSubmission.$inferSelect;
export type NewKycSubmissionType = typeof KycSubmission.$inferInsert;
