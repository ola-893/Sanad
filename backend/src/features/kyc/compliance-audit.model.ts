import { jsonb, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { MainSchema } from '@/db/db.schema.js';

/**
 * Compliance Audit Log Model
 * Immutable, append-only audit trail for KYC/AML events.
 * Event types: 'submitted' | 'screened' | 'under_review' | 'approved' | 'approved_with_edd' | 'rejected'
 */
export const ComplianceAuditLog = MainSchema.table('compliance_audit_log', {
  id: uuid('id').primaryKey().defaultRandom().notNull(),
  userId: varchar('user_id', { length: 40 }).notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actor: varchar('actor', { length: 40 }).notNull(), // Reviewer user ID or 'system:kyc-agent'
  details: jsonb('details').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type ComplianceAuditLogType = typeof ComplianceAuditLog.$inferSelect;
export type NewComplianceAuditLogType = typeof ComplianceAuditLog.$inferInsert;
