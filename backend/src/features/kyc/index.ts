import { kycRoutes } from './kyc.routes.js';
import { kycController, KycController } from './kyc.controller.js';
import { KycService } from './kyc.service.js';
import { KycSubmission, KycSubmissionType, NewKycSubmissionType } from './kyc.model.js';
import { ComplianceAuditLog, ComplianceAuditLogType, NewComplianceAuditLogType } from './compliance-audit.model.js';

export {
  kycRoutes,
  kycController,
  KycController,
  KycService,
  KycSubmission,
  KycSubmissionType,
  NewKycSubmissionType,
  ComplianceAuditLog,
  ComplianceAuditLogType,
  NewComplianceAuditLogType,
};
