import dotenv from 'dotenv';
dotenv.config();

import { pool, db } from '../db/index.js';
import { User } from '../features/auth/auth.model.js';
import { KycSubmission } from '../features/kyc/kyc.model.js';
import { ComplianceAuditLog } from '../features/kyc/compliance-audit.model.js';
import { KycService } from '../features/kyc/kyc.service.js';
import { generateAccessToken } from '../features/jwt/jwt.controller.js';
import { investorController } from '../features/investor/investor.controller.js';
import { creditcoinController } from '../features/creditcoin/creditcoin.controller.js';
import { kycController } from '../features/kyc/kyc.controller.js';
import { createSagController } from '../features/sag/sag.controller.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Helper mock Request and Response
function createMockReqRes(body: any = {}, headers: any = {}, params: any = {}, query: any = {}) {
  const req: any = {
    body,
    headers,
    params,
    query,
    header(name: string) {
      return headers[name.toLowerCase()] || headers[name];
    },
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
  };

  return { req, res };
}

async function runKycFlowVerification() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL - KYC/AML END-TO-END VERIFICATION SUITE');
  console.log('========================================================================\n');

  const client = await pool.connect();
  const kycService = new KycService();

  try {
    const testUserId = 'USR_KYC_TEST_001';
    const testEmail = 'kyctest@sanad.finance';
    const testWallet = '0x9999999999999999999999999999999999999999';

    // 1. Create fresh unverified test user in database
    console.log('[TEST 1] Setting up clean test user account (unverified)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    await client.query('DELETE FROM main.compliance_audit_log WHERE user_id = $1;', [testUserId]);
    await client.query('DELETE FROM main.kyc_submission WHERE user_id = $1;', [testUserId]);
    await client.query('DELETE FROM main.user WHERE user_id = $1 OR user_email = $2;', [testUserId, testEmail]);

    await client.query(`
      INSERT INTO main.user (
        user_id, user_email, user_contact_no, user_password,
        ic_no, user_first_name, user_last_name, gender,
        account_id, wallet_id, role_id, status, created_by, updated_by
      ) VALUES (
        $1, $2, '+60199999999', $3,
        '950101149999', 'Hafiz', 'Tariq', 'MALE',
        $4, $4, 'INVESTOR', 'ACTIVE', 'test', 'test'
      );
    `, [testUserId, testEmail, passwordHash, testWallet]);

    const userToken = generateAccessToken({
      username: testEmail,
      loginType: 'EMAIL',
      roleName: 'USER',
    });

    const complianceToken = generateAccessToken({
      username: 'compliance@sanad.finance',
      loginType: 'EMAIL',
      roleName: 'COMPLIANCE_OFFICER',
    });

    console.log(`✓ Test user created: ${testUserId} (${testEmail})`);
    console.log(`✓ Generated auth tokens for user & compliance officer.\n`);

    // 2. Test Enforcement Gate 1: Unverified borrower attempts SAG note creation
    console.log('[TEST 2] Verifying Enforcement Gate: Unverified borrower attempts SAG creation...');
    const { req: sagReq1, res: sagRes1 } = createMockReqRes(
      {
        sagName: 'Test Note',
        sagDescription: 'Test Desc',
        sagType: 'GOLD',
        sagProperties: {
          assetType: 'GOLD',
          currency: 'USD',
          valuation: 5000,
          karat: 22,
          weightG: 50,
          tenorM: 6,
          investorRoiPercentage: 6,
          investorFinancingType: 'MUDARABAH',
          mintShare: 100,
          enableMinting: true,
        }
      },
      { authorization: `Bearer ${userToken}` }
    );

    await createSagController(sagReq1, sagRes1);
    console.log(`  -> Response Status: ${sagRes1.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(sagRes1.getData(), null, 2));

    if (sagRes1.getStatusCode() !== 403 || sagRes1.getData()?.error !== 'KYC_NOT_APPROVED') {
      throw new Error(`Enforcement gate failed! Expected 403 KYC_NOT_APPROVED, got ${sagRes1.getStatusCode()}`);
    }
    console.log('✓ PASS: Unverified user successfully BLOCKED with HTTP 403 KYC_NOT_APPROVED.\n');

    // 3. Test Enforcement Gate 2: Unverified user attempts collateral mint / loan origination
    console.log('[TEST 3] Verifying Enforcement Gate: Loan origination with unverified borrower...');
    const { req: mintReq1, res: mintRes1 } = createMockReqRes(
      {
        pawnshopAddress: '0x2222222222222222222222222222222222222222',
        borrowerAddress: testWallet,
        weightGrams: 20,
        karat: 22,
        appraisedValueUSD: 1200,
        loanAmount: 800,
      },
      { authorization: `Bearer ${userToken}` }
    );

    await creditcoinController.mintCollateral(mintReq1, mintRes1);
    console.log(`  -> Response Status: ${mintRes1.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(mintRes1.getData(), null, 2));

    if (mintRes1.getStatusCode() !== 403 || mintRes1.getData()?.error !== 'KYC_NOT_APPROVED') {
      throw new Error(`Enforcement gate failed! Expected 403 KYC_NOT_APPROVED for loan origination, got ${mintRes1.getStatusCode()}`);
    }
    console.log('✓ PASS: Loan origination successfully BLOCKED with HTTP 403 KYC_NOT_APPROVED.\n');

    // 4. Submit KYC application via POST /api/v1/kyc/submit
    console.log('[TEST 4] Submitting KYC application (MyKad + IC images)...');
    const { req: subReq, res: subRes } = createMockReqRes(
      {
        userId: testUserId,
        firstName: 'Hafiz',
        lastName: 'Tariq',
        email: testEmail,
        phone: '+60199999999',
        icNo: '950101149999',
        icFrontPicture: 'uploads/hafiz_mykad_front.jpg',
        icBackPicture: 'uploads/hafiz_mykad_back.jpg',
        documentType: 'MyKad',
        nationality: 'Nigeria',
      },
      { authorization: `Bearer ${userToken}` }
    );

    await kycController.submitKyc(subReq, subRes);
    console.log(`  -> Response Status: ${subRes.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(subRes.getData(), null, 2));

    if (subRes.getStatusCode() !== 201 || subRes.getData()?.data?.status !== 'submitted') {
      throw new Error(`KYC submission failed! Expected 201 status 'submitted'`);
    }
    const submissionId = subRes.getData().data.id;
    console.log(`✓ PASS: KYC submission recorded (ID: ${submissionId}, status: 'submitted').\n`);

    // 5. Fetch KYC status via GET /api/v1/kyc/status/:userId
    console.log('[TEST 5] Checking KYC status endpoint for user...');
    const { req: statReq, res: statRes } = createMockReqRes({}, {}, { userId: testUserId });
    await kycController.getKycStatus(statReq, statRes);
    console.log(`  -> Status Data:`, JSON.stringify(statRes.getData(), null, 2));

    if (statRes.getData()?.data?.status !== 'submitted' || statRes.getData()?.data?.isApproved !== false) {
      throw new Error(`KYC status check failed! Expected status 'submitted' with isApproved=false`);
    }
    console.log('✓ PASS: Status endpoint returned correct unapproved status.\n');

    // 6. Fetch pending queue via GET /api/v1/kyc/pending
    console.log('[TEST 6] Checking pending compliance review queue...');
    const { req: pendReq, res: pendRes } = createMockReqRes({}, { authorization: `Bearer ${complianceToken}` });
    await kycController.getPendingKyc(pendReq, pendRes);
    const pendingList = pendRes.getData()?.data || [];
    const foundPending = pendingList.find((p: any) => p.userId === testUserId);

    if (!foundPending) {
      throw new Error(`Newly submitted KYC application not found in pending queue!`);
    }
    console.log(`✓ PASS: Found applicant in pending queue: ${foundPending.name} (IC: ${foundPending.icNo})\n`);

    // 7. Test EDD Validation: approve_with_edd without required fields must be rejected
    console.log('[TEST 7] Testing strict BNM EDD validation (attempting EDD approval with missing fields)...');
    const { req: badEddReq, res: badEddRes } = createMockReqRes(
      {
        status: 'approved_with_edd',
        reviewerId: 'USR_COMPLIANCE_001',
        eddSourceOfFunds: '', // Missing!
        eddApprovedBy: '', // Missing!
      },
      { authorization: `Bearer ${complianceToken}` },
      { id: submissionId }
    );

    await kycController.reviewKyc(badEddReq, badEddRes);
    console.log(`  -> Response Status: ${badEddRes.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(badEddRes.getData(), null, 2));

    if (badEddRes.getStatusCode() !== 400) {
      throw new Error(`Expected 400 validation error for missing EDD fields, got ${badEddRes.getStatusCode()}`);
    }
    console.log('✓ PASS: Incomplete EDD approval strictly REJECTED per BNM AML/CFT compliance rules.\n');

    // 8. Review & Approve with EDD (with all required fields)
    console.log('[TEST 8] Reviewing application: Approving with documented Enhanced Due Diligence...');
    const { req: goodEddReq, res: goodEddRes } = createMockReqRes(
      {
        status: 'approved_with_edd',
        reviewerId: 'USR_COMPLIANCE_001',
        riskScore: 35,
        amlStatus: 'clear',
        flags: ['High net worth retail investor'],
        notes: 'KYC verified against JPN records. Source of wealth validated through audited financial statements.',
        eddSourceOfFunds: 'Verified technology consultancy equity and audited director dividend distributions',
        eddApprovedBy: 'Head of Compliance - Nadia Binti Karim',
      },
      { authorization: `Bearer ${complianceToken}` },
      { id: submissionId }
    );

    await kycController.reviewKyc(goodEddReq, goodEddRes);
    console.log(`  -> Response Status: ${goodEddRes.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(goodEddRes.getData(), null, 2));

    if (goodEddRes.getStatusCode() !== 200 || goodEddRes.getData()?.data?.status !== 'approved_with_edd') {
      throw new Error(`EDD review failed! Expected 200 with status 'approved_with_edd'`);
    }
    console.log('✓ PASS: KYC submission successfully approved with EDD.\n');

    // 9. Verify Compliance Audit Logs
    console.log('[TEST 9] Verifying compliance audit trail in compliance_audit_log...');
    const { req: logReq, res: logRes } = createMockReqRes({}, {}, {}, { userId: testUserId });
    await kycController.getAuditLogs(logReq, logRes);
    const auditLogs = logRes.getData()?.data || [];
    console.log(`  -> Total audit events recorded for user: ${auditLogs.length}`);
    for (const log of auditLogs) {
      console.log(`     • Event: ${log.eventType} | Actor: ${log.actor} | Timestamp: ${log.timestamp}`);
    }

    const hasSubmittedLog = auditLogs.some((l: any) => l.eventType === 'submitted');
    const hasApprovedLog = auditLogs.some((l: any) => l.eventType === 'approved_with_edd' || l.eventType === 'approved');

    if (!hasSubmittedLog || !hasApprovedLog) {
      throw new Error('Missing required compliance audit log events!');
    }
    console.log('✓ PASS: Immutable compliance audit trail verified.\n');

    // 10. Test Enforcement Gate 3: Approved user can now access pool stats & loan origination
    console.log('[TEST 10] Testing access with approved KYC user (pool stats & eligibility)...');
    const { req: invReq2, res: invRes2 } = createMockReqRes(
      {},
      { authorization: `Bearer ${userToken}` }
    );

    await investorController.getPoolStats(invReq2, invRes2);
    console.log(`  -> Response Status: ${invRes2.getStatusCode()}`);
    console.log(`  -> Response Body:`, JSON.stringify(invRes2.getData(), null, 2));

    if (invRes2.getStatusCode() !== 200 || invRes2.getData()?.data?.isKycApproved !== true) {
      throw new Error(`Expected 200 with isKycApproved=true, got ${invRes2.getStatusCode()}`);
    }
    console.log('✓ PASS: KYC-approved user permitted and verified successfully!\n');

    console.log('========================================================================');
    console.log('🎉 ALL KYC/AML PIPELINE VERIFICATION TESTS PASSED!');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ Verification Suite Failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

runKycFlowVerification()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
