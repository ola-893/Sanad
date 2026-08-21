import { pool } from '../db/index.js';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('========================================================================');
  console.log('SANAD PROTOCOL - DATABASE MIGRATION & SEEDING SCRIPT');
  console.log('========================================================================\n');

  const client = await pool.connect();
  try {
    console.log('[1/4] Ensuring PostgreSQL "main" schema and required tables exist...');
    
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS main;

      CREATE TABLE IF NOT EXISTS main.role (
        role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name VARCHAR(40) NOT NULL UNIQUE,
        permission_id VARCHAR(40)[],
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(40) NOT NULL DEFAULT 'system',
        updated_by VARCHAR(40) NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS main.permission (
        permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_name VARCHAR(40) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(40) NOT NULL DEFAULT 'system',
        updated_by VARCHAR(40) NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS main.super_admin (
        super_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        super_admin_nickname VARCHAR(50) NOT NULL,
        super_admin_first_name VARCHAR(50) NOT NULL,
        super_admin_last_name VARCHAR(50) NOT NULL,
        super_admin_email VARCHAR(100) UNIQUE NOT NULL,
        super_admin_contact_no VARCHAR(20) NOT NULL,
        super_admin_password VARCHAR(100) NOT NULL,
        bool_module BOOLEAN NOT NULL DEFAULT true,
        module_access_id VARCHAR(40)[],
        bool_permission BOOLEAN NOT NULL DEFAULT true,
        role_id VARCHAR(40),
        session_id VARCHAR(40),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(40) NOT NULL DEFAULT 'system',
        updated_by VARCHAR(40) NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS main.company_admin (
        company_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_admin_first_name VARCHAR(50) NOT NULL,
        company_admin_last_name VARCHAR(50) NOT NULL,
        company_admin_email VARCHAR(100) UNIQUE NOT NULL,
        company_admin_contact_no VARCHAR(20) NOT NULL,
        company_admin_password VARCHAR(100) NOT NULL,
        company_id VARCHAR(40) NOT NULL,
        bool_module BOOLEAN NOT NULL DEFAULT true,
        module_access_id VARCHAR(40)[],
        bool_permission BOOLEAN NOT NULL DEFAULT true,
        role_id VARCHAR(40),
        session_id VARCHAR(40),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(40) NOT NULL DEFAULT 'system',
        updated_by VARCHAR(40) NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS main.user (
        user_id VARCHAR(40) PRIMARY KEY,
        user_email VARCHAR(100) UNIQUE NOT NULL,
        user_contact_no VARCHAR(20) UNIQUE NOT NULL,
        user_password VARCHAR(100) NOT NULL,
        ic_no VARCHAR(12) NOT NULL,
        ic_front_picture TEXT NOT NULL DEFAULT 'default_front.jpg',
        ic_back_picture TEXT NOT NULL DEFAULT 'default_back.jpg',
        user_first_name VARCHAR(50) NOT NULL,
        user_last_name VARCHAR(50) NOT NULL,
        gender VARCHAR(10) NOT NULL DEFAULT 'MALE',
        account_id VARCHAR(42) NOT NULL,
        address_id VARCHAR(40) NOT NULL DEFAULT 'addr_001',
        company_id VARCHAR(40) NOT NULL DEFAULT 'comp_001',
        vehicle_id VARCHAR(40),
        wallet_id VARCHAR(42) NOT NULL,
        user_skill_id VARCHAR(40),
        job_review_id VARCHAR(40),
        role_id VARCHAR(40) NOT NULL DEFAULT 'BORROWER',
        session_id VARCHAR(40),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(40) NOT NULL DEFAULT 'system',
        updated_by VARCHAR(40) NOT NULL DEFAULT 'system'
      );

      CREATE TABLE IF NOT EXISTS main.creditcoin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(50) NOT NULL,
        contract_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        block_number INTEGER NOT NULL,
        token_id VARCHAR(40),
        details JSONB,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS main.kyc_submission (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(40) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'submitted',
        risk_score INTEGER NOT NULL DEFAULT 0,
        aml_status VARCHAR(20) NOT NULL DEFAULT 'unscreened',
        document_type VARCHAR(40) NOT NULL DEFAULT 'MyKad',
        flags JSONB NOT NULL DEFAULT '[]'::jsonb,
        screened_at TIMESTAMP,
        reviewed_by VARCHAR(40),
        reviewed_at TIMESTAMP,
        reviewer_notes TEXT,
        edd_source_of_funds TEXT,
        edd_approved_by VARCHAR(40),
        next_review_date TIMESTAMP,
        ethereum_wallet_address VARCHAR(46),
        credit_score INTEGER,
        credit_tier VARCHAR(20),
        attestcoin_proof_tx VARCHAR(66),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS main.compliance_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(40) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        actor VARCHAR(40) NOT NULL,
        details JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Tables & schemas verified.');

    console.log('\n[2/4] Seeding default roles...');
    const roles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PAWNSHOP', 'BORROWER', 'INVESTOR', 'COMPLIANCE'];
    for (const r of roles) {
      await client.query(`
        INSERT INTO main.role (role_name, status, created_by, updated_by)
        VALUES ($1, 'ACTIVE', 'seeder', 'seeder')
        ON CONFLICT (role_name) DO NOTHING;
      `, [r]);
    }
    console.log('✓ Roles seeded.');

    console.log('\n[3/4] Hashing password and seeding test accounts (Password: Password123!)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // 1. Super Admin
    await client.query(`
      INSERT INTO main.super_admin (
        super_admin_nickname, super_admin_first_name, super_admin_last_name,
        super_admin_email, super_admin_contact_no, super_admin_password,
        role_id, status, created_by, updated_by
      ) VALUES (
        'SuperAdmin', 'Sanad', 'Regulator',
        'admin@sanad.finance', '+60120000001', $1,
        'SUPER_ADMIN', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (super_admin_email) DO UPDATE SET super_admin_password = $1;
    `, [passwordHash]);

    // 2. Company Admin (Ar-Rahnu HQ)
    await client.query(`
      INSERT INTO main.company_admin (
        company_admin_first_name, company_admin_last_name,
        company_admin_email, company_admin_contact_no, company_admin_password,
        company_id, role_id, status, created_by, updated_by
      ) VALUES (
        'HQ', 'Operator',
        'manager@sanad.finance', '+60120000002', $1,
        'comp_ar_rahnu_hq', 'COMPANY_ADMIN', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (company_admin_email) DO UPDATE SET company_admin_password = $1;
    `, [passwordHash]);

    // 3. Pawnshop Operator User
    await client.query(`
      INSERT INTO main.user (
        user_id, user_email, user_contact_no, user_password,
        ic_no, user_first_name, user_last_name, gender,
        account_id, wallet_id, role_id, status, created_by, updated_by
      ) VALUES (
        'USR_PAWNSHOP_001', 'pawnshop@sanad.finance', '+60120000003', $1,
        '880101145555', 'Ahmad', 'Pawnshop', 'MALE',
        '0x2222222222222222222222222222222222222222', '0x2222222222222222222222222222222222222222',
        'PAWNSHOP', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (user_email) DO UPDATE SET user_password = $1;
    `, [passwordHash]);

    // 4. Borrower User
    await client.query(`
      INSERT INTO main.user (
        user_id, user_email, user_contact_no, user_password,
        ic_no, user_first_name, user_last_name, gender,
        account_id, wallet_id, role_id, status, created_by, updated_by
      ) VALUES (
        'USR_BORROWER_001', 'borrower@sanad.finance', '+60120000004', $1,
        '920505106666', 'Fatima', 'Borrower', 'FEMALE',
        '0x3333333333333333333333333333333333333333', '0x3333333333333333333333333333333333333333',
        'BORROWER', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (user_email) DO UPDATE SET user_password = $1;
    `, [passwordHash]);

    // 5. Investor User
    await client.query(`
      INSERT INTO main.user (
        user_id, user_email, user_contact_no, user_password,
        ic_no, user_first_name, user_last_name, gender,
        account_id, wallet_id, role_id, status, created_by, updated_by
      ) VALUES (
        'USR_INVESTOR_001', 'investor@sanad.finance', '+60120000005', $1,
        '850303107777', 'Zaid', 'Investor', 'MALE',
        '0x5555555555555555555555555555555555555555', '0x5555555555555555555555555555555555555555',
        'INVESTOR', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (user_email) DO UPDATE SET user_password = $1;
    `, [passwordHash]);

    // 6. Compliance Officer User
    await client.query(`
      INSERT INTO main.user (
        user_id, user_email, user_contact_no, user_password,
        ic_no, user_first_name, user_last_name, gender,
        account_id, wallet_id, role_id, status, created_by, updated_by
      ) VALUES (
        'USR_COMPLIANCE_001', 'compliance@sanad.finance', '+60120000006', $1,
        '800101108888', 'Nadia', 'Compliance', 'FEMALE',
        '0x7777777777777777777777777777777777777777', '0x7777777777777777777777777777777777777777',
        'COMPLIANCE', 'ACTIVE', 'seeder', 'seeder'
      ) ON CONFLICT (user_email) DO UPDATE SET user_password = $1;
    `, [passwordHash]);

    console.log('✓ All 6 role accounts created/updated.');

    console.log('\n[4/4] Seeding initial KYC submissions and compliance audit log samples...');
    // Seed approved KYC for borrower, investor, and pawnshop
    await client.query(`
      INSERT INTO main.kyc_submission (
        user_id, status, risk_score, aml_status, document_type, flags,
        screened_at, reviewed_by, reviewed_at, reviewer_notes,
        edd_source_of_funds, edd_approved_by, next_review_date
      ) VALUES
      ('USR_BORROWER_001', 'approved', 15, 'clear', 'MyKad', '[]'::jsonb, NOW(), 'USR_COMPLIANCE_001', NOW(), 'Verified against MyKad front/back. Identity confirmed.', NULL, NULL, NULL),
      ('USR_INVESTOR_001', 'approved_with_edd', 45, 'flagged', 'MyKad', '["High-value investor", "PEP association tier 2"]'::jsonb, NOW(), 'USR_COMPLIANCE_001', NOW(), 'EDD completed. Source of wealth confirmed via tax filings.', 'Verified personal business equity and audited dividends', 'Head of Compliance - Dato Rahman', NOW() + INTERVAL '2 years'),
      ('USR_PAWNSHOP_001', 'approved', 10, 'clear', 'MyKad', '[]'::jsonb, NOW(), 'USR_COMPLIANCE_001', NOW(), 'Ar-Rahnu operator license verified.', NULL, NULL, NULL)
      ON CONFLICT DO NOTHING;

      INSERT INTO main.compliance_audit_log (
        user_id, event_type, actor, details, timestamp
      ) VALUES
      ('USR_BORROWER_001', 'submitted', 'USR_BORROWER_001', '{"documentType": "MyKad", "icNo": "920505106666"}'::jsonb, NOW() - INTERVAL '2 days'),
      ('USR_BORROWER_001', 'approved', 'USR_COMPLIANCE_001', '{"riskScore": 15, "amlStatus": "clear", "notes": "Standard CDD approved"}'::jsonb, NOW() - INTERVAL '1 day'),
      ('USR_INVESTOR_001', 'submitted', 'USR_INVESTOR_001', '{"documentType": "MyKad", "icNo": "850303107777"}'::jsonb, NOW() - INTERVAL '3 days'),
      ('USR_INVESTOR_001', 'edd_triggered', 'system:kyc-agent', '{"flags": ["High-value investor", "PEP association tier 2"], "riskScore": 45}'::jsonb, NOW() - INTERVAL '2 days'),
      ('USR_INVESTOR_001', 'approved_with_edd', 'USR_COMPLIANCE_001', '{"eddSourceOfFunds": "Verified personal business equity and audited dividends", "eddApprovedBy": "Head of Compliance - Dato Rahman", "nextReviewDate": "2028-08-20"}'::jsonb, NOW() - INTERVAL '1 day')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✓ KYC submissions and compliance audit logs seeded.');
    await client.query(`
      INSERT INTO main.creditcoin_audit_log (
        event_type, contract_address, transaction_hash, block_number, token_id, details
      ) VALUES
      ('COLLATERAL_MINTED', '0x65F4C74d081fB4e42Ff05fa3462d7705D172c74e', '0x88f3a9e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9', 104230, '1', '{"pawnshop": "0x2222222222222222222222222222222222222222", "borrower": "0x3333333333333333333333333333333333333333", "weightGrams": 25.0, "karat": 22, "appraisedValueUSD": "1500.00", "loanAmount": "1000.00"}'),
      ('LOAN_FUNDED', '0x66B0D5B5A33D0D8D905187e148A14a79a32cCEa6', '0x77e2a8d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8', 104235, '1', '{"pawnshop": "0x2222222222222222222222222222222222222222", "amountUSD": "1000.00"}'),
      ('REPAYMENT_VERIFIED', '0x66B0D5B5A33D0D8D905187e148A14a79a32cCEa6', '0x66d1a7c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7', 104300, '1', '{"chainKey": 1, "amountUSD": "1000.00", "sourceTxHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}'),
      ('SURPLUS_RETURNED_TO_BORROWER', '0x66B0D5B5A33D0D8D905187e148A14a79a32cCEa6', '0x55c0a6b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6', 104400, '2', '{"borrower": "0x3333333333333333333333333333333333333333", "amountUSD": "350.00", "pawnshop": "0x2222222222222222222222222222222222222222"}')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✓ Audit logs seeded.');

    console.log('\n========================================================================');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('\nDEMO TEST CREDENTIALS:');
    console.log('------------------------------------------------------------------------');
    console.log('• Super Admin / Regulator: admin@sanad.finance    / Password123!');
    console.log('• Company Admin (HQ):      manager@sanad.finance  / Password123!');
    console.log('• Pawnshop Operator:       pawnshop@sanad.finance / Password123!');
    console.log('• Borrower (Pledgor):      borrower@sanad.finance / Password123!');
    console.log('• Investor (LP):           investor@sanad.finance / Password123!');
    console.log('------------------------------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
