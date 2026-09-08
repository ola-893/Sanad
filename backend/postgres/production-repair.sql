CREATE TABLE IF NOT EXISTS main.investment (
id SERIAL PRIMARY KEY,
user_id VARCHAR(40) NOT NULL,
sag_token_id VARCHAR(100) NOT NULL,
pledge_request_id VARCHAR(40) NOT NULL,
amount_usd NUMERIC NOT NULL,
eth_amount NUMERIC,
source_tx_hash VARCHAR(66),
source_chain INTEGER DEFAULT 1,
cc3_tx_hash VARCHAR(66),
status VARCHAR(20) DEFAULT 'completed',
created_at TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investment_user ON main.investment (user_id);
CREATE INDEX IF NOT EXISTS idx_investment_sag ON main.investment (sag_token_id);
CREATE INDEX IF NOT EXISTS idx_investment_pledge ON main.investment (pledge_request_id);
CREATE TABLE IF NOT EXISTS main.loan_repayment (
id SERIAL PRIMARY KEY,
pledge_request_id VARCHAR(40) NOT NULL,
borrower_id VARCHAR(40) NOT NULL,
pawnshop_id VARCHAR(40) NOT NULL,
amount_usd NUMERIC NOT NULL,
tx_hash VARCHAR(66),
cc3_tx_hash VARCHAR(66),
notes TEXT DEFAULT '',
status VARCHAR(20) DEFAULT 'completed',
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_pledge ON main.loan_repayment (pledge_request_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_borrower ON main.loan_repayment (borrower_id);
CREATE TABLE IF NOT EXISTS main.test (
test_id VARCHAR(40) PRIMARY KEY,
created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
