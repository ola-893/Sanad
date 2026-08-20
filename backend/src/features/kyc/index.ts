import { kycRoutes } from './kyc.routes.js';
import { kycController, KycController } from './kyc.controller.js';
import { KycService } from './kyc.service.js';
import { KycSubmission } from './kyc.model.js';
import type { KycSubmissionType, NewKycSubmissionType } from './kyc.model.js';
import { ComplianceAuditLog } from './compliance-audit.model.js';
import type { ComplianceAuditLogType, NewComplianceAuditLogType } from './compliance-audit.model.js';

export {
  kycRoutes,
  kycController,
  KycController,
  KycService,
  KycSubmission,
  ComplianceAuditLog,
};
export type {
  KycSubmissionType,
  NewKycSubmissionType,
  ComplianceAuditLogType,
  NewComplianceAuditLogType,
};
