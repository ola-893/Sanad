import { MainSchema } from "@/db/db.schema.js";
import { jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { EVM_ADDRESS_LENGTH } from "@/db/db.constants.js";

export const PledgeRequestModel = MainSchema.table('pledge_request', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  borrowerId: varchar('borrower_id', { length: 40 }).notNull(),
  borrowerWallet: varchar('borrower_wallet', { length: EVM_ADDRESS_LENGTH }).notNull(),
  pawnshopId: varchar('pawnshop_id', { length: 40 }).notNull(),
  pawnshopWallet: varchar('pawnshop_wallet', { length: EVM_ADDRESS_LENGTH }).notNull(),
  goldDetails: jsonb('gold_details').notNull().default({}),
  requestedAmount: varchar('requested_amount', { length: 50 }).default(''),
  status: varchar('status', { length: 20 }).default('pending'),
  pawnshopNotes: text('pawnshop_notes').default(''),
  sagId: varchar('sag_id', { length: 40 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const CreatePledgeRequestSchema = z.object({
  pawnshopId: z.string().min(1, 'Pawnshop ID is required'),
  goldDetails: z.object({
    assetType: z.string().min(1, 'Asset type is required'),
    karat: z.number().min(1).max(24),
    weightG: z.number().positive(),
    purity: z.number().min(0).max(999),
    estimatedValue: z.number().positive(),
    description: z.string().optional(),
    imageUrl: z.array(z.string()).optional(),
  }),
  requestedAmount: z.string().optional(),
});

export type CreatePledgeRequest = z.infer<typeof CreatePledgeRequestSchema>;
export type PledgeRequestModelType = typeof PledgeRequestModel.$inferSelect;
