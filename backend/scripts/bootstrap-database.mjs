import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function bootstrapDatabase(client, schemaSql) {
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(7349201)');
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'main'",
    );
    const expected = [...schemaSql.matchAll(/CREATE TABLE "main"\."([^"]+)"/g)].map(m => m[1]);
    if (!expected.length) throw new Error('Empty baseline; refusing database initialization');
    if (rows.length === 0) {
      await client.query(schemaSql);
      console.log(`Initialized empty application schema (${expected.length} tables); no accounts or demo records created.`);
    } else {
      const existing = new Set(rows.map(row => row.tablename));
      const missing = expected.filter(name => !existing.has(name));
      if (missing.length) throw new Error(`Existing schema needs a reviewed migration; missing tables: ${missing.join(', ')}`);
      console.log('Application tables already exist; no schema changes made.');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis:10000 });
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const schemaSql = await readFile(new URL('../postgres/bootstrap.sql', import.meta.url), 'utf8');
    const client = await pool.connect();
    try { await bootstrapDatabase(client, schemaSql); } finally { client.release(); }
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
}
