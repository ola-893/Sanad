import { MainSchema } from "@/db/db.schema.js";
import { jsonb, text, timestamp, varchar, numeric, integer } from "drizzle-orm/pg-core";
import { z } from "zod";
import { EVM_ADDRESS_LENGTH } from "@/db/db.constants.js";

export const PledgeRequestModel = MainSchema.table("pledge_request", {
  id: varchar("id", { length: 40 }).primaryKey().notNull(),
  borrowerId: varchar("borrower_id", { length: 40 }).notNull(),
  borrowerWallet: varchar("borrower_wallet", { length: EVM_ADDRESS_LENGTH }).notNull(),
  pawnshopId: varchar("pawnshop_id", { length: 40 }).notNull(),
  pawnshopWallet: varchar("pawnshop_wallet", { length: EVM_ADDRESS_LENGTH }).notNull(),
  goldDetails: jsonb("gold_details").notNull().default({}),
  requestedAmount: varchar("requested_amount", { length: 50 }).default(""),
  status: varchar("status", { length: 20 }).default("pending"),
  pawnshopNotes: text("pawnshop_notes").default(""),
  sagId: varchar("sag_id", { length: 40 }),

  // V2: Borrower credit profile (auto-attached)
  borrowerCreditScore: integer("borrower_credit_score").default(0),
  borrowerCreditTier: varchar("borrower_credit_tier", { length: 20 }).default("Unscored"),
  borrowerEvents: jsonb("borrower_events").default("[]"),
  borrowerTransactionLinks: jsonb("borrower_transaction_links").default("[]"),

  // V2: Gold images
  goldImages: jsonb("gold_images").default("[]"),

  // V2: Physical verification
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending"),
  verificationNotes: text("verification_notes").default(""),
  verifiedWeightG: numeric("verified_weight_g"),
  verifiedKarat: integer("verified_karat"),
  verifiedPurity: numeric("verified_purity"),
  verifiedAppraisedValueUsd: numeric("verified_appraised_value_usd"),

  // V2: Payment tracking
  paymentAmountUsd: numeric("payment_amount_usd"),
  paymentTxHash: varchar("payment_tx_hash", { length: 66 }),
  paymentCc3TxHash: varchar("payment_cc3_tx_hash", { length: 66 }),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
  paidAt: timestamp("paid_at"),

  // V2: SAG minting
  sagTokenId: varchar("sag_token_id", { length: 40 }),
  sagMintedAt: timestamp("sag_minted_at"),

  // V2: Pawnshop contact (shared after acceptance)
  pawnshopContactName: varchar("pawnshop_contact_name", { length: 100 }),
  pawnshopContactPhone: varchar("pawnshop_contact_phone", { length: 30 }),
  pawnshopLocation: text("pawnshop_location"),

  // V2: Loan duration (set during physical meeting)
  loanDurationMonths: integer("loan_duration_months"),
  loanMaturityDate: timestamp("loan_maturity_date"),

  // V3: Investment tracking
  investmentTargetUsd: numeric("investment_target_usd"),
  investmentFilledUsd: numeric("investment_filled_usd").default("0"),
  minInvestmentUsd: numeric("min_investment_usd").default("100"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const CreatePledgeRequestSchema = z.object({
  pawnshopId: z.string().min(1, "Pawnshop ID is required"),
  goldDetails: z.object({
    assetType: z.string().min(1, "Asset type is required"),
    karat: z.number().min(1).max(24),
    weightG: z.number().positive(),
    purity: z.number().min(0).max(999),
    estimatedValue: z.number().positive(),
    description: z.string().optional(),
  }),
  requestedAmount: z.string().optional(),
  goldImages: z.array(z.string()).optional(),
  borrowerCreditScore: z.number().optional(),
  borrowerCreditTier: z.string().optional(),
  borrowerEvents: z.array(z.any()).optional(),
  borrowerTransactionLinks: z.array(z.any()).optional(),
});

export const VerifyGoldSchema = z.object({
  verificationStatus: z.enum(["verified", "rejected"]),
  verificationNotes: z.string().optional(),
  verifiedWeightG: z.number().positive().optional(),
  verifiedKarat: z.number().min(1).max(24).optional(),
  verifiedPurity: z.number().min(0).max(999).optional(),
  verifiedAppraisedValueUsd: z.number().positive().optional(),
  loanDurationMonths: z.number().int().min(1).max(36).optional(),
});

export const RecordPaymentSchema = z.object({
  paymentTxHash: z.string().min(1, "Sepolia transaction hash is required"),
  paymentCc3TxHash: z.string().optional(),
  paymentAmountUsd: z.number().positive(),
});

export type CreatePledgeRequest = z.infer<typeof CreatePledgeRequestSchema>;
export type VerifyGoldInput = z.infer<typeof VerifyGoldSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type PledgeRequestModelType = typeof PledgeRequestModel.$inferSelect;
