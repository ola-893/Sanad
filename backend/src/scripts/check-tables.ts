/**
 * Check actual database tables and schema.
 * Run with: npx tsx src/scripts/check-tables.ts
 */
import { db } from '@/db/index.js';
import { sql } from 'drizzle-orm';

async function checkTables() {
  // List all schemas
  const schemas = await db.execute(sql`
    SELECT schema_name FROM information_schema.schemata 
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schema_name
  `);
  console.log('📋 Schemas:', schemas.rows.map((r: any) => r.schema_name).join(', '));

  // List all tables in all schemas
  const tables = await db.execute(sql`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `);
  console.log('\n📋 Tables:');
  for (const row of tables.rows as any[]) {
    console.log(`  ${row.table_schema}.${row.table_name}`);
  }
}

checkTables();
