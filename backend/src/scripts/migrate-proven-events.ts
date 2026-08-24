import { pool } from '@/db/index.js';

async function migrate() {
  console.log('Creating proven_events table...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS main.proven_events (
      id VARCHAR(66) PRIMARY KEY,
      borrower_address VARCHAR(46) NOT NULL,
      source_tx_hash VARCHAR(66) NOT NULL,
      cc3_tx_hash VARCHAR(66) NOT NULL,
      block_height INTEGER,
      protocol INTEGER,
      event_type INTEGER,
      volume_usd TEXT,
      timestamp INTEGER,
      chain_key INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create index for fast lookups by borrower
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_proven_events_borrower 
    ON main.proven_events(borrower_address);
  `);
  
  // Create index for looking up by source tx hash
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_proven_events_source_tx 
    ON main.proven_events(source_tx_hash);
  `);
  
  console.log('✅ proven_events table created successfully');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
