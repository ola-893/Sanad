-- Fresh-database baseline exported from the current models.
-- Never apply this to an existing application schema.
CREATE SCHEMA IF NOT EXISTS "main";

CREATE TABLE "main"."test" (
	"testId" varchar PRIMARY KEY NOT NULL,
	"status" varchar NOT NULL
);

CREATE TABLE "main"."company_admin" (
	"company_admin_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"company_admin_first_name" varchar(50) NOT NULL,
	"company_admin_last_name" varchar(50) NOT NULL,
	"company_admin_email" varchar(100) NOT NULL,
	"company_admin_contact_no" varchar(20) NOT NULL,
	"company_admin_password" varchar(100) NOT NULL,
	"company_id" varchar(40) NOT NULL,
	"bool_module" boolean NOT NULL,
	"module_access_id" varchar(40)[],
	"bool_permission" boolean NOT NULL,
	"role_id" varchar(40),
	"session_id" varchar(40),
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL,
	CONSTRAINT "company_admin_company_admin_email_unique" UNIQUE("company_admin_email")
);

CREATE TABLE "main"."role_permission" (
	"permission_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"permission_name" varchar(50) NOT NULL,
	"policy" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL
);

CREATE TABLE "main"."super_admin" (
	"super_admin_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"super_admin_nickname" varchar(50) NOT NULL,
	"super_admin_first_name" varchar(50) NOT NULL,
	"super_admin_last_name" varchar(50) NOT NULL,
	"super_admin_email" varchar(100) NOT NULL,
	"super_admin_contact_no" varchar(20) NOT NULL,
	"super_admin_password" varchar(100) NOT NULL,
	"bool_module" boolean NOT NULL,
	"module_access_id" varchar(40)[],
	"bool_permission" boolean NOT NULL,
	"role_id" varchar(40),
	"session_id" varchar(40),
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL,
	CONSTRAINT "super_admin_super_admin_email_unique" UNIQUE("super_admin_email")
);

CREATE TABLE "main"."user" (
	"user_id" varchar(40) NOT NULL,
	"user_email" varchar(100) NOT NULL,
	"user_contact_no" varchar(20) NOT NULL,
	"user_password" varchar(100) NOT NULL,
	"ic_no" varchar(12) NOT NULL,
	"ic_front_picture" text NOT NULL,
	"ic_back_picture" text NOT NULL,
	"user_first_name" varchar(50) NOT NULL,
	"user_last_name" varchar(50) NOT NULL,
	"gender" varchar(10) NOT NULL,
	"account_id" varchar(42) NOT NULL,
	"address_id" varchar(40) NOT NULL,
	"company_id" varchar(40) NOT NULL,
	"vehicle_id" varchar(40),
	"wallet_id" varchar(42) NOT NULL,
	"user_skill_id" varchar(40),
	"job_review_id" varchar(40),
	"role_id" varchar(40),
	"session_id" varchar(40),
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL,
	CONSTRAINT "user_user_email_unique" UNIQUE("user_email"),
	CONSTRAINT "user_user_contact_no_unique" UNIQUE("user_contact_no")
);

CREATE TABLE "main"."user_role" (
	"role_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role_name" varchar(50) NOT NULL,
	"permission_id" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL
);

CREATE TABLE "main"."proven_events" (
	"id" varchar(66) PRIMARY KEY NOT NULL,
	"borrower_address" varchar(46) NOT NULL,
	"source_tx_hash" varchar(66) NOT NULL,
	"cc3_tx_hash" varchar(66) DEFAULT '' NOT NULL,
	"block_height" integer,
	"protocol" integer,
	"event_type" integer,
	"volume_usd" text,
	"timestamp" integer,
	"chain_key" integer DEFAULT 1
);

CREATE TABLE "main"."creditcoin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"contract_address" varchar(42) NOT NULL,
	"transaction_hash" varchar(66) NOT NULL,
	"block_number" integer NOT NULL,
	"token_id" varchar(100),
	"details" jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."gold_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"price_per_gram_usd" numeric(10, 2) NOT NULL,
	"source" varchar(50) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "main"."compliance_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor" varchar(40) NOT NULL,
	"details" jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."kyc_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"aml_status" varchar(20) DEFAULT 'unscreened' NOT NULL,
	"document_type" varchar(40) DEFAULT 'MyKad' NOT NULL,
	"flags" jsonb DEFAULT '[]' NOT NULL,
	"screened_at" timestamp,
	"reviewed_by" varchar(40),
	"reviewed_at" timestamp,
	"reviewer_notes" text,
	"edd_source_of_funds" text,
	"edd_approved_by" varchar(40),
	"next_review_date" timestamp,
	"ethereum_wallet_address" varchar(46),
	"credit_score" integer,
	"credit_tier" varchar(20),
	"attestcoin_proof_tx" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."loan_return" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"pledge_request_id" varchar(40) NOT NULL,
	"sag_token_id" varchar(100) NOT NULL,
	"pawnshop_id" varchar(40),
	"pawnshop_wallet" varchar(42) NOT NULL,
	"investor_wallet" varchar(42) NOT NULL,
	"principal_usd" numeric NOT NULL,
	"profit_usd" numeric NOT NULL,
	"total_return_usd" numeric NOT NULL,
	"principal_wei" varchar(78),
	"profit_wei" varchar(78),
	"total_return_wei" varchar(78),
	"roi_percentage" numeric NOT NULL,
	"duration_months" integer NOT NULL,
	"sepolia_tx_hash" varchar(66) NOT NULL,
	"cc3_tx_hash" varchar(66),
	"proof_job_id" varchar(100),
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"distributed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."pawnshop_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"business_name" text DEFAULT '' NOT NULL,
	"business_registration_no" varchar(50) DEFAULT '',
	"license_number" varchar(50) DEFAULT '',
	"license_expiry" varchar(20) DEFAULT '',
	"business_type" varchar(50) DEFAULT 'ar-rahnu',
	"year_established" varchar(10) DEFAULT '',
	"number_of_employees" varchar(20) DEFAULT '',
	"branch_count" varchar(10) DEFAULT '1',
	"business_phone" varchar(20) DEFAULT '',
	"business_email" varchar(100) DEFAULT '',
	"website" varchar(200) DEFAULT '',
	"address_line1" text DEFAULT '',
	"address_line2" text DEFAULT '',
	"city" varchar(100) DEFAULT '',
	"state" varchar(100) DEFAULT '',
	"postal_code" varchar(10) DEFAULT '',
	"country" varchar(50) DEFAULT 'Nigeria',
	"latitude" varchar(20) DEFAULT '',
	"longitude" varchar(20) DEFAULT '',
	"operating_hours" jsonb DEFAULT '{}'::jsonb,
	"services_offered" jsonb DEFAULT '[]'::jsonb,
	"kyc_status" varchar(20) DEFAULT 'pending',
	"kyc_submitted_at" timestamp,
	"kyc_approved_at" timestamp,
	"kyc_rejection_reason" text,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pawnshop_profile_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "main"."pledge_request" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"borrower_id" varchar(40) NOT NULL,
	"borrower_wallet" varchar(42) NOT NULL,
	"pawnshop_id" varchar(40) NOT NULL,
	"pawnshop_wallet" varchar(42) NOT NULL,
	"gold_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_amount" varchar(50) DEFAULT '',
	"status" varchar(20) DEFAULT 'pending',
	"pawnshop_notes" text DEFAULT '',
	"sag_id" varchar(40),
	"borrower_credit_score" integer DEFAULT 0,
	"borrower_credit_tier" varchar(20) DEFAULT 'Unscored',
	"borrower_events" jsonb DEFAULT '[]',
	"borrower_transaction_links" jsonb DEFAULT '[]',
	"gold_images" jsonb DEFAULT '[]',
	"verification_status" varchar(20) DEFAULT 'pending',
	"verification_notes" text DEFAULT '',
	"verified_weight_g" numeric,
	"verified_karat" integer,
	"verified_purity" numeric,
	"verified_appraised_value_usd" numeric,
	"payment_amount_usd" numeric,
	"payment_tx_hash" varchar(66),
	"payment_cc3_tx_hash" varchar(66),
	"payment_status" varchar(20) DEFAULT 'pending',
	"paid_at" timestamp,
	"sag_token_id" varchar(40),
	"sag_minted_at" timestamp,
	"pawnshop_contact_name" varchar(100),
	"pawnshop_contact_phone" varchar(30),
	"pawnshop_location" text,
	"loan_duration_months" integer,
	"loan_maturity_date" timestamp,
	"investment_target_usd" numeric,
	"investment_filled_usd" numeric DEFAULT '0',
	"min_investment_usd" numeric DEFAULT '100',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "main"."permission" (
	"permission_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"permission_name" varchar(40) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL
);

CREATE TABLE "main"."role" (
	"role_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role_name" varchar(40) NOT NULL,
	"permission_id" varchar(40)[],
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(40) NOT NULL,
	"updated_by" varchar(40) NOT NULL
);

CREATE TABLE "main"."sag" (
	"sag_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" varchar(100) DEFAULT '',
	"sag_name" text NOT NULL,
	"sag_description" text DEFAULT '',
	"sag_properties" jsonb DEFAULT '{}'::jsonb,
	"sag_type" text DEFAULT 'Conventional',
	"cert_no" varchar(100),
	"status" varchar(30) DEFAULT 'active',
	"approval_status" varchar(30) DEFAULT 'pending',
	"original_owner" varchar(42) DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "sag_cert_no_unique" UNIQUE("cert_no")
);
