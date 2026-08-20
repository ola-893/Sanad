import { db } from '@/db/index.js';
import { sql } from 'drizzle-orm';

async function checkConstraints() {
  // Check foreign key constraints on the user table
  const fks = await db.execute(sql`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'main'
      AND tc.table_name = 'user'
  `);

  console.log('FK constraints on main.user:');
  if (fks.rows.length === 0) {
    console.log('  (none)');
  } else {
    for (const row of fks.rows as any[]) {
      console.log(`  ${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
    }
  }

  // Check NOT NULL columns
  const cols = await db.execute(sql`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'main' AND table_name = 'user'
    ORDER BY ordinal_position
  `);

  console.log('\nColumn constraints on main.user:');
  for (const row of cols.rows as any[]) {
    console.log(`  ${row.column_name}: nullable=${row.is_nullable}, default=${row.column_default || 'none'}`);
  }
}

checkConstraints();
