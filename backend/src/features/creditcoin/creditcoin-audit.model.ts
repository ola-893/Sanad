import { MainSchema } from '@/db/db.schema.js';
import { jsonb, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { EVM_ADDRESS_LENGTH, EVM_TX_HASH_LENGTH, TOKEN_ID_LENGTH } from '@/db/db.constants.js';

export const CreditcoinAuditLogModel = MainSchema.table('creditcoin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  contractAddress: varchar('contract_address', { length: EVM_ADDRESS_LENGTH }).notNull(),
  transactionHash: varchar('transaction_hash', { length: EVM_TX_HASH_LENGTH }).notNull(),
  blockNumber: integer('block_number').notNull(),
  tokenId: varchar('token_id', { length: TOKEN_ID_LENGTH }),
  details: jsonb('details').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type CreditcoinAuditLogInsert = typeof CreditcoinAuditLogModel.$inferInsert;
export type CreditcoinAuditLogSelect = typeof CreditcoinAuditLogModel.$inferSelect;
