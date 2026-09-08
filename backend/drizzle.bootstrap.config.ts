import { defineConfig } from 'drizzle-kit';

// Export the current schema offline; no production credentials are needed.
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/db/db.schema.ts', './src/**/*.model.ts'],
});
