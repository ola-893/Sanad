import pg from 'pg';
import { readFile } from 'node:fs/promises';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '10s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query('SELECT pg_advisory_xact_lock(7349201)');
  await client.query('CREATE SCHEMA IF NOT EXISTS main');
  await client.query(await readFile(new URL('../postgres/production-repair.sql', import.meta.url), 'utf8'));
  const result = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'main' AND table_name IN ('investment','loan_repayment','test') ORDER BY table_name, ordinal_position");
  await client.query('COMMIT');
  console.log('Production table repair committed:', JSON.stringify(result.rows));
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Production table repair failed:', error.message);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
