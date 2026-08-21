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

      CREATE TABLE IF NOT EXISTS main.pledge_request (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        borrower_id VARCHAR(40) NOT NULL,
        borrower_wallet VARCHAR(42) NOT NULL,
        pawnshop_id VARCHAR(40) NOT NULL,
        pawnshop_wallet VARCHAR(42) NOT NULL,
        gold_details JSONB NOT NULL DEFAULT '{}',
        requested_amount VARCHAR(50) DEFAULT '',
        status VARCHAR(20) DEFAULT 'pending',
        pawnshop_notes TEXT DEFAULT '',
        sag_id VARCHAR(40),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS main.pawnshop_profile (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(40) NOT NULL UNIQUE,
        wallet_address VARCHAR(42) NOT NULL,
        business_name TEXT NOT NULL DEFAULT '',
        business_registration_no VARCHAR(50) DEFAULT '',
        license_number VARCHAR(50) DEFAULT '',
        license_expiry VARCHAR(20) DEFAULT '',
        business_type VARCHAR(50) DEFAULT 'ar-rahnu',
        year_established VARCHAR(10) DEFAULT '',
        number_of_employees VARCHAR(20) DEFAULT '',
        branch_count VARCHAR(10) DEFAULT '1',
        business_phone VARCHAR(20) DEFAULT '',
        business_email VARCHAR(100) DEFAULT '',
        website VARCHAR(200) DEFAULT '',
        address_line1 TEXT DEFAULT '',
        address_line2 TEXT DEFAULT '',
        city VARCHAR(100) DEFAULT '',
        state VARCHAR(100) DEFAULT '',
        postal_code VARCHAR(10) DEFAULT '',
        country VARCHAR(50) DEFAULT 'Malaysia',
        latitude VARCHAR(20) DEFAULT '',
        longitude VARCHAR(20) DEFAULT '',
        operating_hours JSONB DEFAULT '{}',
        services_offered JSONB DEFAULT '[]',
        kyc_status VARCHAR(20) DEFAULT 'pending',
        kyc_submitted_at TIMESTAMP,
        kyc_approved_at TIMESTAMP,
        kyc_rejection_reason TEXT,
        documents JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS main.sag (
        sag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id VARCHAR(100) DEFAULT '',
        sag_name TEXT NOT NULL,
        sag_description TEXT DEFAULT '',
        sag_properties JSONB DEFAULT '{}',
        sag_type TEXT DEFAULT 'Conventional',
        cert_no VARCHAR(100) UNIQUE,
        status VARCHAR(30) DEFAULT 'active',
        approval_status VARCHAR(30) DEFAULT 'pending',
        original_owner VARCHAR(42) DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP
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

    console.log('\n[3/3] Seeding Super Admin account (email login fallback)...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // Super Admin (needed for email-based admin login fallback)
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

    console.log('✓ Super Admin account ready.');
    console.log('   Skipping demo data — use real wallet-auth accounts instead.');

    console.log('\n========================================================================');
    console.log('🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('\nAdmin login: admin@sanad.finance / Password123! (email-based)');
    console.log('Or use MetaMask wallet auth for any role.');
    console.log('------------------------------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed().then(() => process.exit(0)).catch(() => process.exit(1));
