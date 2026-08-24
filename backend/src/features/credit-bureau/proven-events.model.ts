import { integer, text, varchar } from 'drizzle-orm/pg-core';
import { MainSchema } from '@/db/db.schema.js';

/**
 * Proven Events Model
 * Stores CC3 proof transaction hashes for each proven DeFi event.
 * This allows us to link source tx hashes (Sepolia) to CC3 proof tx hashes.
 */
export const ProvenEvents = MainSchema.table('proven_events', {
  id: varchar('id', { length: 66 }).primaryKey(), // sourceTxHash as primary key
  borrowerAddress: varchar('borrower_address', { length: 46 }).notNull(),
  sourceTxHash: varchar('source_tx_hash', { length: 66 }).notNull(),
  cc3TxHash: varchar('cc3_tx_hash', { length: 66 }).notNull(),
  blockHeight: integer('block_height'),
  protocol: integer('protocol'), // Protocol enum value
  eventType: integer('event_type'), // EventType enum value
  volumeUsd: text('volume_usd'), // Volume in USD (6 decimals)
  timestamp: integer('timestamp'), // Unix timestamp
  chainKey: integer('chain_key').default(1), // 1 = Sepolia, 3 = Mainnet
});

export type ProvenEventType = typeof ProvenEvents.$inferSelect;
export type NewProvenEventType = typeof ProvenEvents.$inferInsert;
