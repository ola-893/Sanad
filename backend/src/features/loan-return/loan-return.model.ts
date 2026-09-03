import { MainSchema } from "@/db/db.schema.js";
import { integer, numeric, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { EVM_ADDRESS_LENGTH, EVM_TX_HASH_LENGTH, TOKEN_ID_LENGTH } from "@/db/db.constants.js";

export const LoanReturnModel = MainSchema.table("loan_return", {
  id: varchar("id", { length: 40 }).primaryKey().notNull(),
  pledgeRequestId: varchar("pledge_request_id", { length: 40 }).notNull(),
  sagTokenId: varchar("sag_token_id", { length: TOKEN_ID_LENGTH }).notNull(),
  pawnshopId: varchar("pawnshop_id", { length: 40 }),
  pawnshopWallet: varchar("pawnshop_wallet", { length: EVM_ADDRESS_LENGTH }).notNull(),
  investorWallet: varchar("investor_wallet", { length: EVM_ADDRESS_LENGTH }).notNull(),
  principalUsd: numeric("principal_usd").notNull(),
  profitUsd: numeric("profit_usd").notNull(),
  totalReturnUsd: numeric("total_return_usd").notNull(),
  principalWei: varchar("principal_wei", { length: 78 }),
  profitWei: varchar("profit_wei", { length: 78 }),
  totalReturnWei: varchar("total_return_wei", { length: 78 }),
  roiPercentage: numeric("roi_percentage").notNull(),
  durationMonths: integer("duration_months").notNull(),
  sepoliaTxHash: varchar("sepolia_tx_hash", { length: EVM_TX_HASH_LENGTH }).notNull(),
  cc3TxHash: varchar("cc3_tx_hash", { length: EVM_TX_HASH_LENGTH }),
  proofJobId: varchar("proof_job_id", { length: 100 }),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  distributedAt: timestamp("distributed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LoanReturnModelType = typeof LoanReturnModel.$inferSelect;
export type LoanReturnModelInsertType = typeof LoanReturnModel.$inferInsert;

export const DistributeReturnSchema = z.object({
  txHash: z.string().min(1, "Sepolia transaction hash is required"),
});

export type DistributeReturnInput = z.infer<typeof DistributeReturnSchema>;
